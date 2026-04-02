"""
Load Testing Service
Executes load tests with async HTTP requests and metrics collection
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List
import httpx
from sqlalchemy.orm import Session
from app.models.loadtest import LoadTest, LoadTestMetric, LoadTestStatus
from app.models.container import Container
from app.services.docker_service import DockerService
from app.database.session import SessionLocal
import statistics


class LoadTestService:
    """Service for executing load tests"""
    
    def __init__(self, db: Session, docker_service: DockerService):
        self.db = db
        self.docker_service = docker_service
        self.active_tests: Dict[int, asyncio.Task] = {}
    
    async def execute_load_test(self, test_id: int):
        """
        Execute a load test asynchronously
        
        Args:
            test_id: ID of the load test to execute
        """
        # Create a new database session for the background task
        # This is necessary because the original session may be closed
        db = SessionLocal()
        try:
            # Get test from database
            test = db.query(LoadTest).filter(LoadTest.id == test_id).first()
            if not test:
                raise ValueError(f"Load test {test_id} not found")
        
            try:
                # Update status to running
                test.status = LoadTestStatus.RUNNING
                test.started_at = datetime.now(timezone.utc)
                db.commit()
                
                # Execute test with local db session
                await self._run_test(test, db)
                
                # Mark as completed
                test.status = LoadTestStatus.COMPLETED
                test.completed_at = datetime.now(timezone.utc)
                db.commit()
                
            except asyncio.CancelledError:
                # Test was cancelled
                test.status = LoadTestStatus.CANCELLED
                test.completed_at = datetime.now(timezone.utc)
                db.commit()
                raise
                
            except Exception as e:
                # Test failed
                test.status = LoadTestStatus.FAILED
                test.error_message = str(e)
                test.completed_at = datetime.now(timezone.utc)
                db.commit()
                raise
        finally:
            db.close()
    
    async def _run_test(self, test: LoadTest, db: Session):
        """
        Execute load test with strict duration enforcement.
        
        Strategy:
        - Send requests at even intervals over the duration
        - Stop ALL activity when duration is reached
        - Don't wait for slow requests to complete
        """
        # Initialize tracking
        semaphore = asyncio.Semaphore(test.concurrency)
        results = {
            "completed": 0,
            "failed": 0,
            "response_times": [],
            "active": 0
        }
        start_time = time.time()
        test.requests_sent = 0
        
        # Start metrics collection task
        metrics_task = asyncio.create_task(
            self._collect_metrics(test, results, start_time, db)
        )
        
        # Calculate request rate: requests per second
        requests_per_second = test.total_requests / test.duration_seconds
        interval = 1.0 / requests_per_second if requests_per_second > 0 else 1.0
        
        # Single request with timeout
        async def send_request(request_num: int):
            async with semaphore:
                results["active"] += 1
                test.requests_sent += 1
                
                try:
                    request_start = time.time()
                    # Set timeout to 5 seconds max per request
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.get(test.target_url)
                        response.raise_for_status()
                    request_end = time.time()
                    
                    # Record success
                    results["completed"] += 1
                    response_time_ms = (request_end - request_start) * 1000
                    results["response_times"].append(response_time_ms)
                    
                except asyncio.TimeoutError:
                    results["failed"] += 1
                except httpx.TimeoutException:
                    results["failed"] += 1
                except httpx.HTTPStatusError:
                    results["failed"] += 1
                except Exception:
                    results["failed"] += 1
                
                finally:
                    results["active"] -= 1
        
        # Main test execution loop
        try:
            request_count = 0
            while request_count < test.total_requests:
                # Check if we've exceeded duration
                elapsed = time.time() - start_time
                if elapsed >= test.duration_seconds:
                    break
                
                # Start next request
                asyncio.create_task(send_request(request_count))
                request_count += 1
                
                # Wait for next interval (unless it's the last request)
                if request_count < test.total_requests:
                    await asyncio.sleep(interval)
            
            # Wait a bit for active requests to finish (max 2 seconds)
            # But don't wait forever
            wait_end = time.time() + 2.0
            while results["active"] > 0 and time.time() < wait_end:
                await asyncio.sleep(0.1)
            
        finally:
            # Stop metrics collection
            metrics_task.cancel()
            try:
                await metrics_task
            except asyncio.CancelledError:
                pass
        
        # Calculate final statistics
        await self._save_final_stats(test, results, db)
    
    
    async def _collect_metrics(self, test: LoadTest, results: Dict, start_time: float, db: Session):
        """Collect container metrics during test execution"""
        try:
            while True:
                # Get container stats
                container = db.query(Container).filter(
                    Container.id == test.container_id
                ).first()
                
                if container and container.deployment_type == "simulated":
                    # Use simulated metrics
                    import random
                    cpu_percent = random.uniform(3, 15)
                    memory_mb = random.uniform(100, 300)
                elif container and container.container_id:
                    # Get real Docker stats using the Docker container ID
                    try:
                        stats = await self.docker_service.get_container_stats_async(container.container_id)
                        cpu_percent = stats.get("cpu_percent", 0)
                        memory_mb = stats.get("memory_usage_mb", 0)
                    except:
                        cpu_percent = 0
                        memory_mb = 0
                else:
                    # No Docker container ID available
                    cpu_percent = 0
                    memory_mb = 0
                
                # Save metric snapshot
                metric = LoadTestMetric(
                    load_test_id=test.id,
                    timestamp=datetime.now(timezone.utc),
                    cpu_percent=cpu_percent,
                    memory_mb=memory_mb,
                    requests_completed=results["completed"],
                    requests_failed=results["failed"],
                    active_requests=results["active"]
                )
                db.add(metric)
                db.commit()
                
                # Update test with current progress
                test.requests_completed = results["completed"]
                test.requests_failed = results["failed"]
                db.commit()
                
                # Wait before next collection
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            raise
    
    async def _save_final_stats(self, test: LoadTest, results: Dict, db: Session):
        """Calculate and save final test statistics"""
        test.requests_completed = results["completed"]
        test.requests_failed = results["failed"]
        
        # Calculate response time statistics
        if results["response_times"]:
            test.avg_response_time_ms = statistics.mean(results["response_times"])
            test.min_response_time_ms = min(results["response_times"])
            test.max_response_time_ms = max(results["response_times"])
        
        # Get peak resource usage from metrics
        metrics = db.query(LoadTestMetric).filter(
            LoadTestMetric.load_test_id == test.id
        ).all()
        
        if metrics:
            test.peak_cpu_percent = max(m.cpu_percent for m in metrics)
            test.peak_memory_mb = max(m.memory_mb for m in metrics)
        
        db.commit()
    
    def start_load_test(self, test_id: int):
        """Start a load test in the background"""
        task = asyncio.create_task(self.execute_load_test(test_id))
        self.active_tests[test_id] = task
        return task
    
    async def cancel_load_test(self, test_id: int):
        """Cancel a running load test"""
        if test_id in self.active_tests:
            task = self.active_tests[test_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.active_tests[test_id]
    
    def get_progress(self, test: LoadTest) -> float:
        """Calculate test progress percentage"""
        if test.total_requests == 0:
            return 0.0
        return (test.requests_sent / test.total_requests) * 100
