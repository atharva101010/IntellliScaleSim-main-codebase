from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Scaling Policy Schemas

class ScalingPolicyBase(BaseModel):
    enabled: bool = True
    scale_up_cpu_threshold: float = Field(default=80.0, ge=0.0, le=100.0)
    scale_up_memory_threshold: float = Field(default=80.0, ge=0.0, le=100.0)
    scale_down_cpu_threshold: float = Field(default=30.0, ge=0.0, le=100.0)
    scale_down_memory_threshold: float = Field(default=30.0, ge=0.0, le=100.0)
    min_replicas: int = Field(default=1, ge=1, le=100)
    max_replicas: int = Field(default=8, ge=1, le=100)
    cooldown_period: int = Field(default=300, ge=60)  # Minimum 1 minute
    evaluation_period: int = Field(default=60, ge=10)  # Minimum 10 seconds
    load_balancer_enabled: bool = True
    load_balancer_port: Optional[int] = Field(default=None, ge=1, le=65535)


class ScalingPolicyCreate(ScalingPolicyBase):
    container_id: int


class ScalingPolicyUpdate(BaseModel):
    enabled: Optional[bool] = None
    scale_up_cpu_threshold: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    scale_up_memory_threshold: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    scale_down_cpu_threshold: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    scale_down_memory_threshold: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    min_replicas: Optional[int] = Field(default=None, ge=1, le=100)
    max_replicas: Optional[int] = Field(default=None, ge=1, le=100)
    cooldown_period: Optional[int] = Field(default=None, ge=60)
    evaluation_period: Optional[int] = Field(default=None, ge=30)
    load_balancer_enabled: Optional[bool] = None
    load_balancer_port: Optional[int] = Field(default=None, ge=1, le=65535)



class ScalingPolicyResponse(ScalingPolicyBase):
    id: int
    container_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_scaled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Scaling Event Schemas

class ScalingEventBase(BaseModel):
    action: str  # 'scale_up' or 'scale_down'
    trigger_metric: str  # 'cpu' or 'memory'
    metric_value: float
    replica_count_before: int
    replica_count_after: int


class ScalingEventCreate(ScalingEventBase):
    policy_id: int
    container_id: int


class ScalingEventResponse(ScalingEventBase):
    id: int
    policy_id: int
    container_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Policy Status Schema

class PolicyStatusOut(BaseModel):
    policy_id: int
    enabled: bool
    current_replicas: int
    min_replicas: int
    max_replicas: int
    can_scale_up: bool
    can_scale_down: bool
    time_since_last_scale: Optional[int] = None  # Seconds
    cooldown_remaining: Optional[int] = None  # Seconds
