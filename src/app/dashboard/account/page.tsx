import { notFound } from "next/navigation";
import { AccountSettings } from "@/features/auth";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Account",
  description: "Manage your name, email, and password.",
};

export default async function AccountPage() {
  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, emailVerified: true },
  });
  // A valid session with no user row means the account was removed.
  if (!row) {
    notFound();
  }
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Account
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your name, email, and password.
        </p>
      </div>
      <AccountSettings
        name={row.name}
        email={row.email}
        emailVerified={row.emailVerified}
      />
    </div>
  );
}
