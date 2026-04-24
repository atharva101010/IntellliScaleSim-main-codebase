from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    classroom_id: int
    title: str
    description: Optional[str]
    instructions: Optional[str]
    status: str
    due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int


class TaskWithCompletionResponse(BaseModel):
    id: int
    classroom_id: int
    title: str
    description: Optional[str]
    instructions: Optional[str]
    status: str
    due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int
    student_completion_status: Optional[str] = None  # pending, in_progress, completed
    student_completed_at: Optional[datetime] = None


class TaskCompletionCreate(BaseModel):
    status: str = Field(default="in_progress")
    submission_notes: Optional[str] = None


class TaskCompletionUpdate(BaseModel):
    status: str = Field(default="completed")
    submission_notes: Optional[str] = None


class TaskCompletionResponse(BaseModel):
    id: int
    task_id: int
    student_id: int
    status: str
    submission_notes: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    updated_at: datetime
