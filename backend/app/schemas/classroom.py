from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    code: str = Field(..., min_length=2, max_length=40)
    description: Optional[str] = None
    semester: str = Field(default="Current", min_length=2, max_length=40)
    max_students: int = Field(default=40, ge=1, le=500)


class ClassroomResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str]
    semester: str
    status: str
    max_students: int
    student_count: int
    deployments_count: int
    created_at: datetime


class ClassroomStudentResponse(BaseModel):
    id: int
    name: str
    email: str
    enrolled_at: Optional[datetime] = None


class ClassroomEnrollmentAction(BaseModel):
    message: str


class StudentClassroomResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str]
    semester: str
    status: str
    max_students: int
    student_count: int
    deployments_count: int
    created_at: datetime
    enrolled_at: Optional[datetime] = None
