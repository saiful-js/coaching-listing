import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { TaxonomyManager } from "@/features/admin/components/taxonomy-manager";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Areas & categories",
  description: "Create, rename, and remove directory taxonomy.",
};

export default async function AdminTaxonomyPage() {
  const [areas, categories] = await Promise.all([
    prisma.area.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameBn: true,
        _count: { select: { coachings: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameBn: true,
        _count: { select: { coachings: true } },
      },
    }),
  ]);

  return (
    <div className="grid gap-8">
      <AdminPageHeader
        title="Areas & categories"
        description="Rename display names freely — the URL slug stays stable. A row in use by listings must be untagged before it can be deleted."
      />
      <TaxonomyManager
        kind="area"
        label="Areas"
        items={areas.map((area) => ({
          id: area.id,
          slug: area.slug,
          nameEn: area.nameEn,
          nameBn: area.nameBn,
          count: area._count.coachings,
        }))}
      />
      <TaxonomyManager
        kind="category"
        label="Categories"
        items={categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          nameEn: category.nameEn,
          nameBn: category.nameBn,
          count: category._count.coachings,
        }))}
      />
    </div>
  );
}
