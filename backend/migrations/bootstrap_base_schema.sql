-- Bootstrap script for fresh PostgreSQL/Supabase databases.
--
-- Run this FIRST on a new database, then run:
-- 1) add_load_testing_tables.sql
-- 2) update_duration_constraint.sql

BEGIN;

-- Create enum types used by SQLAlchemy models.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('student', 'teacher', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'containerstatus') THEN
        CREATE TYPE containerstatus AS ENUM ('pending', 'running', 'stopped', 'error');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tokentype') THEN
        CREATE TYPE tokentype AS ENUM ('verify', 'reset');
    END IF;
END $$;

-- Core auth/user table.
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role userrole NOT NULL DEFAULT 'student',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Core container table.
CREATE TABLE IF NOT EXISTS public.containers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255),
    status containerstatus NOT NULL DEFAULT 'pending',
    port INTEGER,
    cpu_limit INTEGER NOT NULL DEFAULT 500,
    memory_limit INTEGER NOT NULL DEFAULT 512,
    environment_vars JSON,
    deployment_type VARCHAR(20),
    source_url TEXT,
    build_status VARCHAR(20),
    build_logs TEXT,
    container_id VARCHAR(255),
    parent_id INTEGER REFERENCES public.containers(id),
    localhost_url VARCHAR(500),
    public_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS ix_containers_id ON public.containers(id);
CREATE INDEX IF NOT EXISTS ix_containers_user_id ON public.containers(user_id);

-- Token table used by auth flows.
CREATE TABLE IF NOT EXISTS public.user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    type tokentype NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS ix_user_tokens_user_id ON public.user_tokens(user_id);

COMMIT;

-- Verification snapshot
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'containers', 'user_tokens')
ORDER BY table_name;
