-- Migration script to add Task management tables
-- Run this with psql or pgAdmin

BEGIN;

-- Prerequisite checks
DO $$
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.users. Run backend/migrations/bootstrap_base_schema.sql first.';
    END IF;

    IF to_regclass('public.classrooms') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.classrooms. Run backend/migrations/bootstrap_base_schema.sql first.';
    END IF;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    
    due_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create task_completions table to track student progress
CREATE TABLE IF NOT EXISTS public.task_completions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    submission_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_task_student UNIQUE(task_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_classroom_id ON public.tasks(classroom_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_student_id ON public.task_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_status ON public.task_completions(status);

COMMIT;
