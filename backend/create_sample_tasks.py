#!/usr/bin/env python
"""Script to add sample tasks for testing."""

import sys
sys.path.insert(0, '/workspaces/IntellliScaleSim-main-codebase/backend')

from datetime import datetime, timedelta
from app.models.task import Task, TaskCompletion, TaskStatus, TaskCompletionStatus
from app.database.session import SessionLocal
from app.models.classroom import Classroom, ClassEnrollment
from app.models.user import User

db = SessionLocal()

try:
    # Get the first classroom and students
    classroom = db.query(Classroom).first()
    
    if not classroom:
        print("❌ No classrooms found. Create a classroom first.")
        sys.exit(1)
    
    # Get enrolled students
    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.classroom_id == classroom.id
    ).all()
    
    if not enrollments:
        print("❌ No enrolled students in classroom. Enroll a student first.")
        sys.exit(1)
    
    print(f"📚 Found classroom: {classroom.name} ({classroom.code})")
    print(f"👥 Found {len(enrollments)} enrolled student(s)")
    
    # Create sample tasks
    tasks_data = [
        {
            "title": "Deploying a basic application",
            "description": "Deploy a simple containerized application and verify it's running",
            "instructions": """1. Go to the Deployments page
2. Click "Deploy Container"
3. Select a pre-built application (e.g., nginx or httpbin)
4. Configure the port and resource limits
5. Click "Deploy"
6. Wait for the container to start (green status)
7. Verify the endpoint is accessible by clicking the URL link
8. Take a screenshot of the running container""",
            "due_at": datetime.utcnow() + timedelta(days=7),
        },
        {
            "title": "Run a load test and analyze metrics",
            "description": "Execute a load test on your deployed container and capture performance metrics",
            "instructions": """1. Go to the Load Testing page
2. Select your running container
3. Set parameters:
   - Total Requests: 1000
   - Concurrency: 10
   - Duration: 60 seconds
4. Click "Start Test"
5. Wait for the test to complete
6. Review the results:
   - Average response time
   - Min/Max response times
   - Success rate
   - Peak CPU and Memory usage
7. Document your findings""",
            "due_at": datetime.utcnow() + timedelta(days=10),
        },
        {
            "title": "Observe auto-scaling behavior",
            "description": "Create scaling policies and observe how the system scales replicas based on load",
            "instructions": """1. Go to the Autoscaling page
2. Create a scaling policy for your container:
   - CPU Threshold: 70%
   - Memory Threshold: 80%
   - Min Replicas: 1
   - Max Replicas: 5
3. Go back to Load Testing
4. Run another test with higher concurrency (20-30)
5. Watch the Monitoring dashboard for replica scaling
6. Document how many replicas were created and when""",
            "due_at": datetime.utcnow() + timedelta(days=14),
        },
        {
            "title": "Compare cloud pricing models",
            "description": "Use the Billing calculator to compare costs across AWS, GCP, and Azure",
            "instructions": """1. Go to the Billing page
2. Enter your test scenario parameters:
   - Container CPU: 2 cores
   - Container Memory: 4 GB
   - Number of replicas: 3
   - Runtime: 1 hour per day for 30 days
3. Compare pricing across providers:
   - AWS EC2
   - Google Cloud Run
   - Azure Container Instances
4. Create a summary table showing:
   - Provider name
   - Total monthly cost
   - Cost per hour
   - Cost per request (if applicable)
5. Identify the most cost-effective option""",
            "due_at": datetime.utcnow() + timedelta(days=21),
        },
    ]
    
    created_tasks = []
    for task_data in tasks_data:
        task = Task(
            classroom_id=classroom.id,
            created_by=classroom.teacher_id,
            title=task_data["title"],
            description=task_data["description"],
            instructions=task_data["instructions"],
            due_at=task_data["due_at"],
            status=TaskStatus.active,
        )
        db.add(task)
        db.flush()
        created_tasks.append(task)
        print(f"✅ Created task: {task.title}")
    
    # Create sample task completions (some students started, some completed)
    student_ids = [e.student_id for e in enrollments]
    
    for i, task in enumerate(created_tasks):
        for student_id in student_ids[:len(student_ids)]:
            if i < 2 and student_id == student_ids[0]:
                # First student completed first 2 tasks
                completion = TaskCompletion(
                    task_id=task.id,
                    student_id=student_id,
                    status=TaskCompletionStatus.completed,
                    submission_notes="Completed and verified the deployment works correctly.",
                    completed_at=datetime.utcnow() - timedelta(days=max(0, 7 - i * 3)),
                )
            elif i == 0 and student_id == student_ids[0]:
                # Already covered above
                pass
            elif i < 1 and len(student_ids) > 1 and student_id == student_ids[-1]:
                # Last student started first task
                completion = TaskCompletion(
                    task_id=task.id,
                    student_id=student_id,
                    status=TaskCompletionStatus.in_progress,
                    submission_notes="In progress - working on deployment step 5",
                )
            else:
                # Others haven't started
                completion = TaskCompletion(
                    task_id=task.id,
                    student_id=student_id,
                    status=TaskCompletionStatus.pending,
                )
            
            db.add(completion)
    
    db.commit()
    print("\n✅ Sample tasks and completions created successfully!")
    print(f"   - {len(created_tasks)} tasks created")
    print(f"   - {len(student_ids)} students linked to each task")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    sys.exit(1)
finally:
    db.close()
