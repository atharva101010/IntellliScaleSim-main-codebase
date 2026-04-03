-- Migration to align load_tests constraints with current API limits.
-- duration_seconds: 10-1800
-- total_requests: 1-50000
-- concurrency: 1-500

DO $$
BEGIN
  IF to_regclass('public.load_tests') IS NULL THEN
    RAISE EXCEPTION 'Table public.load_tests does not exist. Run backend/migrations/add_load_testing_tables.sql first (after bootstrap_base_schema.sql).';
  END IF;
END $$;

-- Drop old constraints (if they exist)
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_duration_seconds_check;
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_total_requests_check;
ALTER TABLE public.load_tests DROP CONSTRAINT IF EXISTS load_tests_concurrency_check;

-- Add current constraints
ALTER TABLE public.load_tests
  ADD CONSTRAINT load_tests_duration_seconds_check CHECK (duration_seconds BETWEEN 10 AND 1800),
  ADD CONSTRAINT load_tests_total_requests_check CHECK (total_requests BETWEEN 1 AND 50000),
  ADD CONSTRAINT load_tests_concurrency_check CHECK (concurrency BETWEEN 1 AND 500);

-- Verify constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.load_tests'::regclass
  AND conname IN (
    'load_tests_duration_seconds_check',
    'load_tests_total_requests_check',
    'load_tests_concurrency_check'
  )
ORDER BY conname;
