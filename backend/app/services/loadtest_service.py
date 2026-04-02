"""
Load Testing Service
Executes load tests with async HTTP requests and metrics collection
"""
import asyncio
import os
import statistics
import time
from datetime import datetime, timezone
from typing import ClassVar, Dict, Optional
from urllib.parse import urlparse, urlunparse

import httpx
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.loadtest import LoadTest, LoadTestMetric, LoadTestStatus
from app.services.docker_service import DockerService


class LoadTestService:
    """Service for executing load tests."""

    _active_tests: ClassVar[Dict[int, asyncio.Task]] = {}

    def __init__(self, db: Session, docker_service: DockerService):
        self.db = db
        self.docker_service = docker_service

    @classmethod
    def register_test_task(cls, test_id: int, task: asyncio.Task):
        """Register an in-flight test task for cross-request cancellation."""
        cls._active_tests[test_id] = task

    @classmethod
    def get_test_task(cls, test_id: int) -> Optional[asyncio.Task]:
        """Get currently running task for a test ID."""
        return cls._active_tests.get(test_id)

    @classmethod
    def remove_test_task(cls, test_id: int):
        """Remove task from active registry."""
        cls._active_tests.pop(test_id, None)

    def _resolve_target_url(self, target_url: str) -> str:
        """Resolve localhost targets for both host and Dockerized backend runtime modes."""
        try:
            parsed = urlparse(target_url)
            if parsed.hostname not in {"localhost", "127.0.0.1"}:
                return target_url

            replacement_host = os.getenv("LOADTEST_LOCALHOST_HOST")
            if not replacement_host:
                replacement_host = "host.docker.internal" if self._is_running_inside_container() else "localhost"

            netloc = replacement_host
            if parsed.port:
                netloc = f"{replacement_host}:{parsed.port}"

            return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
        except Exception:
            return target_url

    @staticmethod
    def _is_running_inside_container() -> bool:
        """Best-effort check for containerized backend execution."""
        if os.path.exists("/.dockerenv"):
            return True

        cgroup_path = "/proc/1/cgroup"
        if os.path.exists(cgroup_path):
            try:
                with open(cgroup_path, "r", encoding="utf-8") as fh:
                    cgroup_text = fh.read()
                return "docker" in cgroup_text or "containerd" in cgroup_text
            except Exception:
                return False
        return False

    async def execute_load_test(self, test_id: int):
        """Execute a load test asynchronously."""
        db = SessionLocal()
        try:
            test = db.query(LoadTest).filter(LoadTest.id == test_id).first()
            if not test:
                raise ValueError(f"Load test {test_id} not found")

            try:
                test.status = LoadTestStatus.RUNNING
                test.started_at = datetime.now(timezone.utc)
                db.commit()

                await self._run_test(test, db)

                if test.status == LoadTestStatus.RUNNING:
                    test.status = LoadTestStatus.COMPLETED
                    test.completed_at = datetime.now(timezone.utc)
                    db.commit()

            except asyncio.CancelledError:
                test.status = LoadTestStatus.CANCELLED
                test.completed_at = datetime.now(timezone.utc)
                db.commit()
                raise

            except Exception as e:
                test.status = LoadTestStatus.FAILED
                test.error_message = str(e)
                test.completed_at = datetime.now(timezone.utc)
                db.commit()
                raise
        finally:
            self.remove_test_task(test_id)
            db.close()

    async def _run_test(self, test: LoadTest, db: Session):
        """Execute load test with strict duration enforcement and worker-pool dispatch."""
        target_url = self._resolve_target_url(test.target_url)
        test.requests_sent = 0
        db.commit()

        results: Dict[str, object] = {
            "completed": 0,
            "failed": 0,
            "response_times": [],
            "active": 0,
            "sent": 0,
        }

        start_time = time.time()
        stop_at = time.monotonic() + test.duration_seconds

        metrics_task = asyncio.create_task(self._collect_metrics(test, results, start_time, db))

        worker_count = max(1, min(test.concurrency, test.total_requests, 500))
        work_queue: asyncio.Queue[int] = asyncio.Queue()
        for request_num in range(test.total_requests):
            work_queue.put_nowait(request_num)

        request_timeout_seconds = min(max(test.duration_seconds / 4, 2.0), 15.0)
        connection_limit = min(max(worker_count * 2, 100), 1000)
        keepalive_limit = min(max(worker_count, 50), 500)

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(request_timeout_seconds, connect=5.0),
                limits=httpx.Limits(
                    max_connections=connection_limit,
                    max_keepalive_connections=keepalive_limit,
                ),
            ) as client:

                async def send_request():
                    if time.monotonic() >= stop_at:
                        return

                    results["active"] = int(results["active"]) + 1
                    results["sent"] = int(results["sent"]) + 1

                    try:
                        request_start = time.perf_counter()
                        response = await client.get(target_url)
                        request_end = time.perf_counter()

                        if 200 <= response.status_code < 400:
                            results["completed"] = int(results["completed"]) + 1
                        else:
                            results["failed"] = int(results["failed"]) + 1

                        response_time_ms = (request_end - request_start) * 1000
                        response_times = results["response_times"]
                        if isinstance(response_times, list):
                            response_times.append(response_time_ms)

                    except (asyncio.TimeoutError, httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
                        results["failed"] = int(results["failed"]) + 1
                    except Exception:
                        results["failed"] = int(results["failed"]) + 1
                    finally:
                        results["active"] = max(0, int(results["active"]) - 1)

                async def worker():
                    while time.monotonic() < stop_at:
                        try:
                            work_queue.get_nowait()
                        except asyncio.QueueEmpty:
                            return

                        try:
                            await send_request()
                        finally:
                            work_queue.task_done()

                workers = [asyncio.create_task(worker()) for _ in range(worker_count)]

                try:
                    await asyncio.wait_for(
                        asyncio.gather(*workers, return_exceptions=True),
                        timeout=test.duration_seconds + 20,
                    )
                except asyncio.TimeoutError:
                    for worker_task in workers:
                        worker_task.cancel()
                    await asyncio.gather(*workers, return_exceptions=True)
        finally:
            metrics_task.cancel()
            try:
                await asyncio.wait_for(metrics_task, timeout=2)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

        await self._save_final_stats(test, results, db)

    async def _collect_metrics(self, test: LoadTest, results: Dict[str, object], start_time: float, db: Session):
        """Collect container metrics during test execution."""
        _ = start_time
        try:
            while True:
                container = db.query(Container).filter(Container.id == test.container_id).first()

                if container and container.deployment_type == "simulated":
                    import random

                    cpu_percent = random.uniform(3, 15)
                    memory_mb = random.uniform(100, 300)
                elif container and container.container_id:
                    try:
                        stats = await self.docker_service.get_container_stats_async(container.container_id)
                        cpu_percent = stats.get("cpu_percent", 0)
                        memory_mb = stats.get("memory_usage_mb", 0)
                    except Exception:
                        cpu_percent = 0
                        memory_mb = 0
                else:
                    cpu_percent = 0
                    memory_mb = 0

                metric = LoadTestMetric(
                    load_test_id=test.id,
                    timestamp=datetime.now(timezone.utc),
                    cpu_percent=cpu_percent,
                    memory_mb=memory_mb,
                    requests_completed=int(results["completed"]),
                    requests_failed=int(results["failed"]),
                    active_requests=int(results["active"]),
                )
                db.add(metric)
                db.commit()

                test.requests_sent = int(results["sent"])
                test.requests_completed = int(results["completed"])
                test.requests_failed = int(results["failed"])
                db.commit()

                await asyncio.sleep(2)
        except asyncio.CancelledError:
            raise

    async def _save_final_stats(self, test: LoadTest, results: Dict[str, object], db: Session):
        """Calculate and save final test statistics."""
        test.requests_sent = int(results["sent"])
        test.requests_completed = int(results["completed"])
        test.requests_failed = int(results["failed"])

        response_times = results.get("response_times", [])
        if isinstance(response_times, list) and response_times:
            test.avg_response_time_ms = statistics.mean(response_times)
            test.min_response_time_ms = min(response_times)
            test.max_response_time_ms = max(response_times)

        metrics = db.query(LoadTestMetric).filter(LoadTestMetric.load_test_id == test.id).all()
        if metrics:
            test.peak_cpu_percent = max(m.cpu_percent for m in metrics)
            test.peak_memory_mb = max(m.memory_mb for m in metrics)

        db.commit()

    def start_load_test(self, test_id: int):
        """Start a load test in the background."""
        task = asyncio.create_task(self.execute_load_test(test_id))
        self.register_test_task(test_id, task)
        return task

    async def cancel_load_test(self, test_id: int):
        """Cancel a running load test."""
        task = self.get_test_task(test_id)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            self.remove_test_task(test_id)

    def get_progress(self, test: LoadTest) -> float:
        """Calculate test progress percentage."""
        if test.total_requests == 0:
            return 0.0
        sent = max(test.requests_sent, test.requests_completed + test.requests_failed)
        return min((sent / test.total_requests) * 100, 100.0)
