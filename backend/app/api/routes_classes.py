from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.core.security import get_current_user, require_roles
from app.database.session import get_db
from app.models.classroom import Classroom, ClassroomStatus, ClassEnrollment
from app.models.container import Container
from app.models.user import User, UserRole
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomEnrollmentAction,
    ClassroomResponse,
    ClassroomStudentResponse,
)


router = APIRouter(prefix="/classes", tags=["classes"])


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_admin(user: User) -> bool:
    return _role_value(user) == UserRole.admin.value


def _can_manage_classroom(user: User, classroom: Classroom) -> bool:
    return _is_admin(user) or classroom.teacher_id == user.id


def _to_classroom_response(db: Session, classroom: Classroom) -> ClassroomResponse:
    student_rows = db.query(ClassEnrollment.student_id).filter(
        ClassEnrollment.classroom_id == classroom.id
    ).all()
    student_ids = [student_id for (student_id,) in student_rows]
    student_count = len(student_ids)

    deployments_count = 0
    if student_ids:
        deployments_count = (
            db.query(func.count(Container.id))
            .filter(
                Container.user_id.in_(student_ids),
                Container.parent_id.is_(None),
            )
            .scalar()
            or 0
        )

    status_value = classroom.status.value if hasattr(classroom.status, "value") else str(classroom.status)

    return ClassroomResponse(
        id=classroom.id,
        name=classroom.name,
        code=classroom.code,
        description=classroom.description,
        semester=classroom.semester,
        status=status_value,
        max_students=classroom.max_students,
        student_count=student_count,
        deployments_count=int(deployments_count),
        created_at=classroom.created_at,
    )


@router.get("/teacher", response_model=List[ClassroomResponse])
def list_teacher_classes(
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    query = db.query(Classroom)
    if not _is_admin(current_user):
        query = query.filter(Classroom.teacher_id == current_user.id)

    classrooms = query.order_by(Classroom.created_at.desc()).all()
    return [_to_classroom_response(db, classroom) for classroom in classrooms]


@router.post("/teacher", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_teacher_class(
    payload: ClassroomCreate,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    normalized_code = payload.code.strip().upper()

    existing = db.query(Classroom).filter(
        Classroom.teacher_id == current_user.id,
        Classroom.code == normalized_code,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class code '{normalized_code}' already exists",
        )

    classroom = Classroom(
        teacher_id=current_user.id,
        name=payload.name.strip(),
        code=normalized_code,
        description=payload.description.strip() if payload.description else None,
        semester=payload.semester.strip(),
        max_students=payload.max_students,
        status=ClassroomStatus.active,
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    return _to_classroom_response(db, classroom)


@router.get("/teacher/{classroom_id}/students", response_model=List[ClassroomStudentResponse])
def list_classroom_students(
    classroom_id: int,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if not _can_manage_classroom(current_user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    rows = (
        db.query(User, ClassEnrollment)
        .join(ClassEnrollment, ClassEnrollment.student_id == User.id)
        .filter(ClassEnrollment.classroom_id == classroom_id)
        .order_by(User.name.asc())
        .all()
    )

    return [
        ClassroomStudentResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            enrolled_at=enrollment.created_at,
        )
        for user, enrollment in rows
    ]


@router.post("/teacher/{classroom_id}/students/{student_id}", response_model=ClassroomEnrollmentAction)
def enroll_student(
    classroom_id: int,
    student_id: int,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if not _can_manage_classroom(current_user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    student_role = student.role.value if hasattr(student.role, "value") else str(student.role)
    if student_role != UserRole.student.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only student accounts can be enrolled")

    existing = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == classroom_id,
        ClassEnrollment.student_id == student_id,
    ).first()
    if existing:
        return ClassroomEnrollmentAction(message="Student already enrolled")

    current_count = db.query(func.count(ClassEnrollment.id)).filter(
        ClassEnrollment.classroom_id == classroom_id
    ).scalar() or 0

    if current_count >= classroom.max_students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class is already full")

    enrollment = ClassEnrollment(classroom_id=classroom_id, student_id=student_id)
    db.add(enrollment)
    db.commit()

    return ClassroomEnrollmentAction(message="Student enrolled successfully")


@router.delete("/teacher/{classroom_id}/students/{student_id}", response_model=ClassroomEnrollmentAction)
def remove_student(
    classroom_id: int,
    student_id: int,
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
    db: Session = Depends(get_db),
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if not _can_manage_classroom(current_user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    enrollment = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == classroom_id,
        ClassEnrollment.student_id == student_id,
    ).first()

    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    db.delete(enrollment)
    db.commit()

    return ClassroomEnrollmentAction(message="Student removed from class")
