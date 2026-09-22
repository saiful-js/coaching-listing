import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

export type SessionResolver = () => Promise<{ user: SessionUser } | null>;

/**
 * Default resolver: reads the Better Auth session for the current request.
 * Kept behind an injectable seam so unit tests can stub the session without
 * touching `next/headers` (which only works inside a request scope).
 */
async function defaultSessionResolver(): Promise<{
  user: SessionUser;
} | null> {
  const { headers } = await import("next/headers");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  const role =
    (session.user as unknown as { role?: unknown }).role ?? "OWNER";
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: typeof role === "string" ? role : "OWNER",
    },
  };
}

/** 401 unless a session exists. */
export async function requireUser(
  resolver: SessionResolver = defaultSessionResolver,
): Promise<SessionUser> {
  const session = await resolver();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session.user;
}

/** 401 unless logged in, 403 unless `role === "ADMIN"`. */
export async function requireAdmin(
  resolver: SessionResolver = defaultSessionResolver,
): Promise<SessionUser> {
  const user = await requireUser(resolver);
  if (user.role !== "ADMIN") {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * 401 unless logged in; 404 unless the listing exists AND the caller owns
 * it (admins may access any existing listing). Cross-owner ids return 404,
 * never 403, so ownership cannot be probed (PRD FR-2).
 */
export async function requireOwnerOf(
  coachingId: string,
  resolver: SessionResolver = defaultSessionResolver,
): Promise<{ id: string; ownerId: string }> {
  const user = await requireUser(resolver);
  const coaching = await prisma.coaching.findUnique({
    where: { id: coachingId },
    select: { id: true, ownerId: true },
  });
  if (!coaching) {
    throw new NotFoundError();
  }
  if (user.role !== "ADMIN" && coaching.ownerId !== user.id) {
    throw new NotFoundError();
  }
  return coaching;
}
