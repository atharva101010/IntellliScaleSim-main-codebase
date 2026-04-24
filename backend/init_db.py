#!/usr/bin/env python
"""Initialize database tables using SQLAlchemy ORM."""

import sys
sys.path.insert(0, '/workspaces/IntellliScaleSim-main-codebase/backend')

from app.models.base import Base
from app.models.user import User
from app.models.container import Container
from app.models.classroom import Classroom, ClassEnrollment
from app.models.task import Task, TaskCompletion
from app.models.loadtest import LoadTest, LoadTestMetric
from app.models.scaling_policy import ScalingPolicy, ScalingEvent
from app.models.billing_models import ResourceQuota, ResourceUsage, BillingSnapshot, PricingModel
from app.models.token import UserToken
from app.models.secret import UserSecret
from app.database.session import engine

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ All database tables created successfully!")
