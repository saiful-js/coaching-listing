"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/features/auth/client";

const linkClassName = "text-ink-soft transition-colors hover:text-ink";
const ctaClassName = "btn btn-primary h-9 px-4 text-[13px]";

/**
 * Session-aware menubar links (client-side so the header — and every page
 * using it — stays statically renderable). Each role gets its own set:
 * visitors are sold the product, owners get to work, admins get to moderate.
 * While the session resolves we render neutral placeholders (never flash
 * either set to the wrong audience).
 */
export function SiteNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    // Neutral placeholders: never flash the wrong links while the session
    // resolves (visitor links here would visibly swap for logged-in users).
    return (
      <nav
        aria-label="Main"
        aria-busy="true"
        className="flex items-center gap-6 text-sm"
      >
        <span
          aria-hidden
          className="h-4 w-14 animate-pulse rounded-sm bg-line"
        />
        <span
          aria-hidden
          className="h-4 w-20 animate-pulse rounded-sm bg-line"
        />
        <span
          aria-hidden
          className="h-9 w-32 animate-pulse rounded-sm bg-line"
        />
      </nav>
    );
  }

  if (!session) {
    return (
      <nav aria-label="Main" className="flex items-center gap-6 text-sm">
        <Link href="/coachings" className={linkClassName}>
          Browse
        </Link>
        <Link href="/#owners" className={linkClassName}>
          For owners
        </Link>
        <Link href="/login" className={linkClassName}>
          Log in
        </Link>
        <Link href="/register" className={ctaClassName}>
          List your coaching
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="flex items-center gap-6 text-sm">
      <Link href="/coachings" className={linkClassName}>
        Browse
      </Link>
      <Link href="/dashboard" className={linkClassName}>
        Dashboard
      </Link>
      {isAdmin ? (
        <Link href="/admin" className={linkClassName}>
          Admin
        </Link>
      ) : (
        <Link href="/dashboard/listings/new" className={ctaClassName}>
          New listing
        </Link>
      )}
      <button
        type="button"
        onClick={signOut}
        className={`${linkClassName} cursor-pointer`}
      >
        Sign out
      </button>
    </nav>
  );
}
