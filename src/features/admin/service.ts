import { z } from "zod";
import type { Actor } from "@/features/listings/service";
import type { Area, Category } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/auth-helpers";
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

/**
 * Minimal taxonomy management (M6): create-only. Rename/delete stay out
 * (live listings reference these rows; that needs a merge flow, not a
 * delete button).
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
