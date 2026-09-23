"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavItem {
  href: string;
  label: string;
  /** Match only the exact path (the listings landing page). */
  exact?: boolean;
}

const LINKS: DashboardNavItem[] = [
  { href: "/dashboard", label: "My listings", exact: true },
  { href: "/dashboard/account", label: "Account" },
];

/** Owner navigation. Mirrors the admin shell so the app feels consistent. */
export function DashboardNav() {
  const pathname = usePathname();
  const isActive = (item: DashboardNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <nav aria-label="Dashboard sections" className="mt-3">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {LINKS.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="shrink-0">
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
