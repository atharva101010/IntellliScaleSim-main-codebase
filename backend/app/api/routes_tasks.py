from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.security import get_current_user, require_roles
from app.database.session import get_db
from app.models.classroom import Classroom, ClassEnrollment
from app.models.task import Task, TaskCompletion, TaskStatus, TaskCompletionStatus
from app.models.user import User, UserRole
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskWithCompletionResponse,
    TaskCompletionCreate,
    TaskCompletionUpdate,
    TaskCompletionResponse,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_response(task: Task) -> TaskResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    return TaskResponse(
        id=task.id,
        classroom_id=task.classroom_id,
        title=task.title,
        description=task.description,
        instructions=task.instructions,
        status=status_value,
        due_at=task.due_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        created_by=task.created_by,
    )


def _task_with_completion_to_response(task: Task, completion: TaskCompletion = None) -> TaskWithCompletionResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    completion_status = None
    completed_at = None
    
    if completion:
        completion_status = completion.status.value if hasattr(completion.status, "value") else str(completion.status)
        completed_at = completion.completed_at
    
    return TaskWithCompletionResponse(
        id=task.id,
        classroom_id=task.classroom_id,
        title=task.title,
        description=task.description,
        instructions=task.instructions,
        status=status_value,
        due_at=task.due_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        created_by=task.created_by,
        student_completion_status=completion_status,
        student_completed_at=completed_at,
    )


@router.post("/classroom/{classroom_id}", response_model=TaskResponse)
def create_task(
    classroom_id: int,
    task_data: TaskCreate,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Create a new task for a classroom (teacher only)."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check if current user is the teacher or admin
    if classroom.teacher_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create tasks for this classroom")
    
    task = Task(
        classroom_id=classroom_id,
        created_by=current_user.id,
        title=task_data.title,
        description=task_data.description,
        instructions=task_data.instructions,
        due_at=task_data.due_at,
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return _task_to_response(task)


@router.get("/classroom/{classroom_id}", response_model=List[TaskResponse])
def list_classroom_tasks(
    classroom_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all tasks for a classroom."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Verify user is enrolled in the classroom or is a teacher/admin
    is_enrolled = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == classroom_id,
        ClassEnrollment.student_id == current_user.id
    ).first()
    
    is_teacher = classroom.teacher_id == current_user.id or current_user.role == UserRole.admin
    
    if not is_enrolled and not is_teacher:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view tasks for this classroom")
    
    tasks = db.query(Task).filter(Task.classroom_id == classroom_id).order_by(Task.created_at.desc()).all()
    return [_task_to_response(task) for task in tasks]


@router.get("/student", response_model=List[TaskWithCompletionResponse])
def list_student_tasks(
    current_user: User = Depends(require_roles(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Get all tasks for classrooms the student is enrolled in with completion status."""
    # Get all classrooms the student is enrolled in
    enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.student_id == current_user.id).all()
    classroom_ids = [e.classroom_id for e in enrollments]
    
    if not classroom_ids:
        return []
    
    # Get all tasks for these classrooms
    tasks = db.query(Task).filter(Task.classroom_id.in_(classroom_ids)).order_by(Task.created_at.desc()).all()
    
    result = []
    for task in tasks:
        # Get completion status for this task
        completion = db.query(TaskCompletion).filter(
            TaskCompletion.task_id == task.id,
            TaskCompletion.student_id == current_user.id
        ).first()
        
        result.append(_task_with_completion_to_response(task, completion))
    
    return result


@router.get("/{task_id}", response_model=TaskWithCompletionResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get task details."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check permissions
    classroom = task.classroom
    is_enrolled = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == classroom.id,
        ClassEnrollment.student_id == current_user.id
    ).first()
    
    is_teacher = classroom.teacher_id == current_user.id or current_user.role == UserRole.admin
    
    if not is_enrolled and not is_teacher:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this task")
    
    # Get completion status
    completion = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.student_id == current_user.id
    ).first()
    
    return _task_with_completion_to_response(task, completion)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Update a task (teacher only)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check authorization
    if task.created_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this task")
    
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.instructions is not None:
        task.instructions = task_data.instructions
    if task_data.due_at is not None:
        task.due_at = task_data.due_at
    if task_data.status is not None:
        task.status = TaskStatus(task_data.status)
    
    db.commit()
    db.refresh(task)
    
    return _task_to_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Delete a task (teacher only)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check authorization
    if task.created_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this task")
    
    db.delete(task)
    db.commit()


@router.post("/{task_id}/complete", response_model=TaskCompletionResponse)
def mark_task_complete(
    task_id: int,
    completion_data: TaskCompletionCreate,
    current_user: User = Depends(require_roles(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Mark a task as complete (student)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check if student is enrolled in the classroom
    is_enrolled = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == task.classroom_id,
        ClassEnrollment.student_id == current_user.id
    ).first()
    
    if not is_enrolled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this classroom")
    
    # Get or create task completion record
    completion = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.student_id == current_user.id
    ).first()
    
    if not completion:
        completion = TaskCompletion(
            task_id=task_id,
            student_id=current_user.id,
        )
        db.add(completion)
    
    completion.status = TaskCompletionStatus(completion_data.status)
    completion.submission_notes = completion_data.submission_notes
    
    if completion_data.status == "completed":
        completion.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(completion)
    
    return TaskCompletionResponse(
        id=completion.id,
        task_id=completion.task_id,
        student_id=completion.student_id,
        status=completion.status.value if hasattr(completion.status, "value") else str(completion.status),
        submission_notes=completion.submission_notes,
        created_at=completion.created_at,
        completed_at=completion.completed_at,
        updated_at=completion.updated_at,
    )


@router.get("/{task_id}/completion", response_model=TaskCompletionResponse)
def get_task_completion(
    task_id: int,
    current_user: User = Depends(require_roles(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Get task completion status for current student."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    completion = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.student_id == current_user.id
    ).first()
    
    if not completion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task completion not found")
    
    return TaskCompletionResponse(
        id=completion.id,
        task_id=completion.task_id,
        student_id=completion.student_id,
        status=completion.status.value if hasattr(completion.status, "value") else str(completion.status),
        submission_notes=completion.submission_notes,
        created_at=completion.created_at,
        completed_at=completion.completed_at,
        updated_at=completion.updated_at,
    )
