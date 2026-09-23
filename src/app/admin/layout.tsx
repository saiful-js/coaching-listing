import { redirect } from "next/navigation";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";

// Admin pages are per-admin and auth-gated: never prerender or cache them.
export const dynamic = "force-dynamic";

/**
 * Everything under /admin requires the ADMIN role. Anonymous users go to
 * login; logged-in non-admins go home (the admin surface stays unhinted).
 * The shell renders a persistent sidebar so every section is one click away.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    redirect("/");
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="eyebrow">Moderation</p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Admin
      </h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[210px_1fr] lg:gap-10">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
