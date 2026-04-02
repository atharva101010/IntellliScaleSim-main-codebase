"""
Pydantic schemas for Load Testing API
"""
from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LoadTestStatus(str, Enum):
    """Load test execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LoadTestCreate(BaseModel):
    """Schema for creating a new load test"""
    container_id: int = Field(..., description="ID of the container to test")
    target_url: Optional[str] = Field(None, description="Optional custom URL to test (defaults to container URL)")
    total_requests: int = Field(..., ge=1, le=50000, description="Total number of requests (1-50000)")
    concurrency: int = Field(..., ge=1, le=500, description="Number of concurrent requests (1-500)")
    duration_seconds: int = Field(..., ge=10, le=1800, description="Test duration in seconds (10-1800)")
    
    @validator('total_requests')
    def validate_requests(cls, v):
        if v > 50000:
            raise ValueError("Maximum requests allowed: 50000")
        return v
    
    @validator('concurrency')
    def validate_concurrency(cls, v):
        if v > 500:
            raise ValueError("Concurrency cannot exceed: 500")
        return v
    
    @validator('duration_seconds')
    def validate_duration(cls, v):
        if v > 1800:
            raise ValueError("Duration cannot exceed 30 minutes (1800 seconds)")
        return v


class LoadTestMetricResponse(BaseModel):
    """Schema for a single metric snapshot"""
    timestamp: datetime
    cpu_percent: float
    memory_mb: float
    requests_completed: int
    requests_failed: int
    active_requests: int
    
    class Config:
        from_attributes = True


class LoadTestResponse(BaseModel):
    """Schema for load test response"""
    id: int
    user_id: int
    container_id: int
    target_url: str
    total_requests: int
    concurrency: int
    duration_seconds: int
    status: LoadTestStatus
    error_message: Optional[str] = None
    
    # Results
    requests_sent: int
    requests_completed: int
    requests_failed: int
    
    # Statistics
    avg_response_time_ms: Optional[float] = None
    min_response_time_ms: Optional[float] = None
    max_response_time_ms: Optional[float] = None
    peak_cpu_percent: Optional[float] = None
    peak_memory_mb: Optional[float] = None
    
    # Timestamps
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Computed fields
    progress_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


class LoadTestDetailedResponse(LoadTestResponse):
    """Detailed load test response including metrics"""
    metrics: List[LoadTestMetricResponse] = []


class LoadTestListItem(BaseModel):
    """Schema for load test in list view"""
    id: int
    container_id: int
    container_name: Optional[str] = None
    total_requests: int
    requests_completed: int
    requests_failed: int
    status: LoadTestStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoadTestHistoryResponse(BaseModel):
    """Schema for load test history response"""
    tests: List[LoadTestListItem]
    total: int


class LoadTestStreamMetric(BaseModel):
    """Schema for SSE stream metric updates"""
    timestamp: str
    cpu: float
    memory: float
    completed: int
    failed: int
    progress: float
    active: int


class LoadTestStartResponse(BaseModel):
    """Response when load test is started"""
    id: int
    status: str
    message: str


class LoadTestCancelResponse(BaseModel):
    """Response when load test is cancelled"""
    message: str
