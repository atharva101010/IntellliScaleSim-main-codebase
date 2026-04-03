-- Migration script to add Load Testing tables
-- Run this with psql or pgAdmin
--
-- Important:
-- 1) This script expects the base app schema to already exist (users, containers).
-- 2) It is idempotent and also updates old check constraints to current API limits.

BEGIN;

-- Prerequisite checks with clear error messages.
DO $$
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.users. Run backend/migrations/bootstrap_base_schema.sql first.';
    END IF;

    IF to_regclass('public.containers') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.containers. Run backend/migrations/bootstrap_base_schema.sql first.';
    END IF;
END $$;

-- Create load_tests table (if missing)
CREATE TABLE IF NOT EXISTS public.load_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    container_id INTEGER NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,

    -- Test configuration
    target_url VARCHAR NOT NULL,
    total_requests INTEGER NOT NULL,
    concurrency INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,

    -- Results
    requests_sent INTEGER DEFAULT 0,
    requests_completed INTEGER DEFAULT 0,
    requests_failed INTEGER DEFAULT 0,

    -- Response time statistics (milliseconds)
    avg_response_time_ms FLOAT,
    min_response_time_ms FLOAT,
    max_response_time_ms FLOAT,

    -- Resource usage peaks
    peak_cpu_percent FLOAT,
    peak_memory_mb FLOAT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Ensure load_tests check constraints reflect current API limits:
-- total_requests: 1-50000, concurrency: 1-500, duration_seconds: 10-1800.
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_total_requests_check;
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_concurrency_check;
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_duration_seconds_check;

ALTER TABLE public.load_tests
    ADD CONSTRAINT load_tests_total_requests_check CHECK (total_requests BETWEEN 1 AND 50000),
    ADD CONSTRAINT load_tests_concurrency_check CHECK (concurrency BETWEEN 1 AND 500),
    ADD CONSTRAINT load_tests_duration_seconds_check CHECK (duration_seconds BETWEEN 10 AND 1800);

-- Create indexes for load_tests
CREATE INDEX IF NOT EXISTS idx_load_tests_user_id ON public.load_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_load_tests_container_id ON public.load_tests(container_id);
CREATE INDEX IF NOT EXISTS idx_load_tests_status ON public.load_tests(status);

-- Create load_test_metrics table (if missing)
CREATE TABLE IF NOT EXISTS public.load_test_metrics (
    id SERIAL PRIMARY KEY,
    load_test_id INTEGER NOT NULL REFERENCES public.load_tests(id) ON DELETE CASCADE,

    -- Timestamp of this metric snapshot
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Container resource metrics
    cpu_percent FLOAT NOT NULL,
    memory_mb FLOAT NOT NULL,

    -- Request progress at this timestamp
    requests_completed INTEGER DEFAULT 0,
    requests_failed INTEGER DEFAULT 0,
    active_requests INTEGER DEFAULT 0
);

-- Create indexes for load_test_metrics
CREATE INDEX IF NOT EXISTS idx_load_test_metrics_load_test_id ON public.load_test_metrics(load_test_id);
CREATE INDEX IF NOT EXISTS idx_load_test_metrics_timestamp ON public.load_test_metrics(timestamp);

COMMIT;

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('load_tests', 'load_test_metrics')
ORDER BY table_name;
