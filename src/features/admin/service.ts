import { z } from "zod";
import type { Actor } from "@/features/listings/service";
import type { Area, Category } from "@/generated/prisma/client";
import { ForbiddenError, NotFoundError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

const taxonomySchema = z.object({
  nameEn: z.string().trim().min(2).max(100),
  nameBn: z.string().trim().min(1).max(100),
});

export type TaxonomyInput = z.infer<typeof taxonomySchema>;

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

function assertSluggable(nameEn: string): string {
  const slug = slugifyName(nameEn);
  // Bangla-only (or symbol-only) names would all collapse onto "item" with
  // no rename flow to recover — fail closed with an actionable message.
  if (slug === "item" && !/[a-z0-9]/.test(nameEn.toLowerCase())) {
    throw new Error(
      "English name must contain at least one Latin letter or digit (used for the URL).",
    );
  }
  return slug;
}

function requireAdminActor(actor: Actor) {
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError();
  }
}

async function assertAnotherAdminRemains(userId: string) {
  // Never let the last admin lock everyone out of moderation.
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins <= 1) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (target?.role === "ADMIN") {
      throw new Error("At least one admin must remain.");
    }
  }
}

/* ────────────────────────────── Taxonomy ────────────────────────────── */

/**
 * Taxonomy management (M6 + admin panel). Create, rename and delete.
 * Renames keep the slug (URL stability, PRD §7); deletes fail closed while
 * any listing still references the row, since a merge flow is out of scope.
 */
export async function createArea(actor: Actor, input: unknown): Promise<Area> {
  requireAdminActor(actor);
  const parsed = taxonomySchema.parse(input);
  const slug = assertSluggable(parsed.nameEn);
  const taken =
    (await prisma.area.findUnique({
      where: { slug },
      select: { id: true },
    })) !== null;
  if (taken) {
    throw new Error(`Area slug "${slug}" is already taken.`);
  }
  const maxSort = await prisma.area.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return prisma.area.create({
    data: {
      slug,
      nameEn: parsed.nameEn,
      nameBn: parsed.nameBn,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  });
}

export async function createCategory(
  actor: Actor,
  input: unknown,
): Promise<Category> {
  requireAdminActor(actor);
  const parsed = taxonomySchema.parse(input);
  const slug = assertSluggable(parsed.nameEn);
  const taken =
    (await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    })) !== null;
  if (taken) {
    throw new Error(`Category slug "${slug}" is already taken.`);
  }
  const maxSort = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return prisma.category.create({
    data: {
      slug,
      nameEn: parsed.nameEn,
      nameBn: parsed.nameBn,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  });
}

const taxonomyUpdateSchema = taxonomySchema.extend({
  id: z.string().min(1).max(100),
});

export async function updateArea(actor: Actor, input: unknown): Promise<Area> {
  requireAdminActor(actor);
  const parsed = taxonomyUpdateSchema.parse(input);
  const existing = await prisma.area.findUnique({
    where: { id: parsed.id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  // Slug is intentionally untouched — published URLs must stay stable.
  return prisma.area.update({
    where: { id: parsed.id },
    data: { nameEn: parsed.nameEn, nameBn: parsed.nameBn },
  });
}

export async function updateCategory(
  actor: Actor,
  input: unknown,
): Promise<Category> {
  requireAdminActor(actor);
  const parsed = taxonomyUpdateSchema.parse(input);
  const existing = await prisma.category.findUnique({
    where: { id: parsed.id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  return prisma.category.update({
    where: { id: parsed.id },
    data: { nameEn: parsed.nameEn, nameBn: parsed.nameBn },
  });
}

const taxonomyIdSchema = z.object({ id: z.string().min(1).max(100) });

export async function deleteArea(actor: Actor, input: unknown): Promise<void> {
  requireAdminActor(actor);
  const parsed = taxonomyIdSchema.parse(input);
  const existing = await prisma.area.findUnique({
    where: { id: parsed.id },
    select: { id: true, nameEn: true, _count: { select: { coachings: true } } },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  if (existing._count.coachings > 0) {
    throw new Error(
      `"${existing.nameEn}" is still used by ${existing._count.coachings} listing(s). Move or delete them first.`,
    );
  }
  await prisma.area.delete({ where: { id: parsed.id } });
}

export async function deleteCategory(
  actor: Actor,
  input: unknown,
): Promise<void> {
  requireAdminActor(actor);
  const parsed = taxonomyIdSchema.parse(input);
  const existing = await prisma.category.findUnique({
    where: { id: parsed.id },
    select: { id: true, nameEn: true, _count: { select: { coachings: true } } },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  if (existing._count.coachings > 0) {
    throw new Error(
      `"${existing.nameEn}" is still used by ${existing._count.coachings} listing(s). Untag them first.`,
    );
  }
  await prisma.category.delete({ where: { id: parsed.id } });
}

/* ─────────────────────────── User accounts ─────────────────────────── */

const roleSchema = z.object({
  userId: z.string().min(1).max(100),
  role: z.enum(["OWNER", "ADMIN"]),
});

const banSchema = z.object({
  userId: z.string().min(1).max(100),
  reason: z.string().trim().min(1).max(500),
  /** Days until the ban lifts; omitted/null = permanent. */
  expiresInDays: z.number().int().min(1).max(3650).nullish(),
});

const verifiedSchema = z.object({
  userId: z.string().min(1).max(100),
  verified: z.boolean(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
  banned: true,
  banReason: true,
  banExpires: true,
} as const;

async function adminTargetOr404(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) {
    throw new NotFoundError();
  }
  return user;
}

/** Promote/demote a user. Cannot change your own role (lockout guard). */
export async function setUserRole(
  actor: Actor,
  input: unknown,
): Promise<{ id: string }> {
  requireAdminActor(actor);
  const parsed = roleSchema.parse(input);
  if (parsed.userId === actor.id) {
    throw new Error("You cannot change your own role.");
  }
  await adminTargetOr404(parsed.userId);
  if (parsed.role === "OWNER") {
    await assertAnotherAdminRemains(parsed.userId);
  }
  const updated = await prisma.user.update({
    where: { id: parsed.userId },
    data: { role: parsed.role },
    select: { id: true },
  });
  return updated;
}

/**
 * Suspend an account. Bans are enforced at session creation
 * (`src/lib/auth.ts`); existing sessions are revoked here so the ban takes
 * effect immediately rather than at cookie expiry.
 */
export async function banUser(
  actor: Actor,
  input: unknown,
): Promise<{ id: string }> {
  requireAdminActor(actor);
  const parsed = banSchema.parse(input);
  if (parsed.userId === actor.id) {
    throw new Error("You cannot suspend your own account.");
  }
  await adminTargetOr404(parsed.userId);
  await assertAnotherAdminRemains(parsed.userId);
  const days = parsed.expiresInDays ?? null;
  const banExpires =
    days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: parsed.userId },
      data: {
        banned: true,
        banReason: parsed.reason,
        banExpires,
      },
      select: { id: true },
    }),
    prisma.session.deleteMany({ where: { userId: parsed.userId } }),
  ]);
  return updated;
}

export async function unbanUser(
  actor: Actor,
  input: unknown,
): Promise<{ id: string }> {
  requireAdminActor(actor);
  const parsed = taxonomyIdSchema.parse(input);
  await adminTargetOr404(parsed.id);
  return prisma.user.update({
    where: { id: parsed.id },
    data: { banned: false, banReason: null, banExpires: null },
    select: { id: true },
  });
}

/** Support escape hatch: mark an address verified when mail delivery fails. */
export async function setEmailVerified(
  actor: Actor,
  input: unknown,
): Promise<{ id: string }> {
  requireAdminActor(actor);
  const parsed = verifiedSchema.parse(input);
  await adminTargetOr404(parsed.userId);
  return prisma.user.update({
    where: { id: parsed.userId },
    data: { emailVerified: parsed.verified },
    select: { id: true },
  });
}

/**
 * Admin-only lookup for support emails (resend verification / password
 * reset). Keeps the authorization check in one place so the actions that
 * call Better Auth's mail endpoints cannot skip it.
 */
export async function getSupportTarget(
  actor: Actor,
  userId: string,
): Promise<{ id: string; email: string }> {
  requireAdminActor(actor);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new NotFoundError();
  }
  return user;
}
