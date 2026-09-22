import { prisma } from "@/lib/db";

/**
 * Public read models (M5, PRD FR-4/FR-5). Server-only: every query filters
 * `status: "PUBLISHED"` — no unreviewed listing is ever publicly visible
 * (G3). Card selects stay minimal (fields + cover only).
 */
export const PAGE_SIZE = 12;

export interface PublishedFilters {
  q?: string;
  areaSlug?: string;
  categorySlug?: string;
  page?: number;
}

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  area: { select: { slug: true, nameEn: true, nameBn: true } },
  images: {
    where: { isCover: true },
    take: 1,
    select: { key: true, width: true, height: true },
  },
} as const;

function buildWhere(filters: PublishedFilters) {
  const q = filters.q?.trim() || undefined;
  return {
    status: "PUBLISHED" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { addressLine: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filters.areaSlug ? { area: { slug: filters.areaSlug } } : {}),
    ...(filters.categorySlug
      ? { categories: { some: { slug: filters.categorySlug } } }
      : {}),
  };
}

const publishedOrder = [
  { publishedAt: "desc" as const },
  { id: "desc" as const },
];

export async function listPublished(filters: PublishedFilters) {
  const page =
    filters.page && Number.isInteger(filters.page) && filters.page > 0
      ? filters.page
      : 1;
  const where = buildWhere(filters);
  const [total, items] = await Promise.all([
    prisma.coaching.count({ where }),
    prisma.coaching.findMany({
      where,
      orderBy: publishedOrder,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPublishedBySlug(slug: string) {
  return prisma.coaching.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      addressLine: true,
      phone: true,
      whatsapp: true,
      email: true,
      facebookUrl: true,
      publishedAt: true,
      area: { select: { slug: true, nameEn: true, nameBn: true } },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { slug: true, nameEn: true, nameBn: true },
      },
      images: {
        orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
        select: {
          id: true,
          key: true,
          width: true,
          height: true,
          isCover: true,
        },
      },
    },
  });
}

export async function getAreaWithListings(slug: string) {
  const area = await prisma.area.findUnique({
    where: { slug },
    select: { slug: true, nameEn: true, nameBn: true },
  });
  if (!area) {
    return null;
  }
  const { items, total } = await listPublished({ areaSlug: slug });
  return { area, items, total };
}

export async function latestPublished(limit: number) {
  return prisma.coaching.findMany({
    where: { status: "PUBLISHED" },
    orderBy: publishedOrder,
    take: Math.max(1, Math.min(24, limit)),
    select: cardSelect,
  });
}

export async function allCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, nameEn: true, nameBn: true },
  });
}

export async function areasWithCounts() {
  const areas = await prisma.area.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, nameEn: true, nameBn: true },
  });
  const counts = await prisma.coaching.groupBy({
    by: ["areaId"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  const byArea = new Map(counts.map((c) => [c.areaId, c._count._all]));
  const withIds = await prisma.area.findMany({
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(withIds.map((a) => [a.slug, a.id]));
  return areas.map((area) => ({
    ...area,
    count: byArea.get(idBySlug.get(area.slug) ?? "") ?? 0,
  }));
}
