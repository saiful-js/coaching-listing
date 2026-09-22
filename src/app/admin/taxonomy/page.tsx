import {
  AreaForm,
  CategoryForm,
} from "@/features/admin/components/taxonomy-forms";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Areas & categories",
  description: "Manage directory taxonomy.",
};

export default async function AdminTaxonomyPage() {
  const [areas, categories] = await Promise.all([
    prisma.area.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        nameEn: true,
        nameBn: true,
        _count: { select: { coachings: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        nameEn: true,
        nameBn: true,
        _count: { select: { coachings: true } },
      },
    }),
  ]);

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Areas
        </h1>
        <ul className="grid gap-2">
          {areas.map((area) => (
            <li
              key={area.slug}
              className="flex items-baseline justify-between gap-4 rounded-sm border border-line bg-paper-raised px-4 py-3"
            >
              <span className="text-sm">
                <span className="font-content">{area.nameEn}</span>{" "}
                <span className="font-content text-ink-soft">
                  · {area.nameBn}
                </span>
              </span>
              <span className="font-mono text-xs text-ink-faint">
                {area._count.coachings} listings
              </span>
            </li>
          ))}
        </ul>
        <AreaForm />
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-2xl font-medium tracking-tight">
          Categories
        </h2>
        <ul className="grid gap-2">
          {categories.map((category) => (
            <li
              key={category.slug}
              className="flex items-baseline justify-between gap-4 rounded-sm border border-line bg-paper-raised px-4 py-3"
            >
              <span className="text-sm">
                <span className="font-content">{category.nameEn}</span>{" "}
                <span className="font-content text-ink-soft">
                  · {category.nameBn}
                </span>
              </span>
              <span className="font-mono text-xs text-ink-faint">
                {category._count.coachings} listings
              </span>
            </li>
          ))}
        </ul>
        <CategoryForm />
      </section>
    </div>
  );
}
