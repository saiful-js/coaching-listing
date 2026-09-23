"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavItem {
  href: string;
  label: string;
  /** Match only the exact path (the Overview landing page). */
  exact?: boolean;
}

const LINKS: AdminNavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/taxonomy", label: "Areas & categories" },
];

/**
 * Admin navigation. A vertical sidebar on large screens; a horizontally
 * scrollable bar on phones so every section stays reachable with a thumb.
 */
export function AdminNav() {
  const pathname = usePathname();
  const isActive = (item: AdminNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <nav
      aria-label="Admin sections"
      className="lg:sticky lg:top-8 lg:self-start"
    >
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {LINKS.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center rounded-sm px-3 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-forest font-medium text-paper"
                    : "text-ink-soft hover:bg-forest-tint hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
