import { redirect } from "next/navigation";
import { requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";

/**
 * Everything under /admin requires the ADMIN role. Anonymous users go to
 * login; logged-in non-admins go home (the admin surface stays unhinted).
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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Moderation</p>
      <nav aria-label="Admin" className="mt-3 flex gap-5 text-sm">
        <a
          href="/admin/listings?status=PENDING"
          className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Review queue
        </a>
        <a
          href="/admin/taxonomy"
          className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Areas & categories
        </a>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
