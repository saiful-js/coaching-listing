import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumbs {
  label: string;
  href?: string;
}

/** Shared admin page header: breadcrumbs, title, description, actions. */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  titleClassName = "",
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumbs[];
  actions?: ReactNode;
  /** Extra classes for the title (e.g. `font-content` for Bangla names). */
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-faint">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="underline-offset-4 hover:text-ink hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  <span aria-hidden>/</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h2
          className={`font-display text-2xl font-medium tracking-tight ${titleClassName}`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
