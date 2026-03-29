-- Add timezone + locale to users (missing from init migration)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "locale"   TEXT NOT NULL DEFAULT 'en';

-- Add timezone to organizations (missing from init migration)
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
