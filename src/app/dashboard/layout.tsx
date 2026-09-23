import { redirect } from "next/navigation";
import { DashboardNav } from "@/features/listings/components/dashboard-nav";
import { requireUser, UnauthorizedError } from "@/lib/auth-helpers";

// Dashboard pages are per-owner and auth-gated: never prerender or cache them.
export const dynamic = "force-dynamic";

/** Owner shell: one place for the guard, the heading, and the section nav. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Owner dashboard</p>
      <DashboardNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
