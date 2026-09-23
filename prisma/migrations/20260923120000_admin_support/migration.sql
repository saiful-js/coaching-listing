-- Admin support panel: account suspension (app-owned columns on the Better
-- Auth user table; not part of the Better Auth CLI output).
-- Enforced at session creation in src/lib/auth.ts — a banned user cannot
-- start a new session, and banning revokes existing sessions.
ALTER TABLE "user" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN "banExpires" TIMESTAMP(3);
