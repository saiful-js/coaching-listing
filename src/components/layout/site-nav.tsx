"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/features/auth/client";

const linkClassName = "text-ink-soft transition-colors hover:text-ink";

/**
 * Session-aware menubar links (client-side so the header — and every page
 * using it — stays statically renderable). Shows Dashboard + Sign out when
 * logged in, Log in otherwise.
 */
export function SiteNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav aria-label="Main" className="flex items-center gap-6 text-sm">
      <Link href="/coachings" className={linkClassName}>
        Browse
      </Link>
      <Link href="/#owners" className={linkClassName}>
        For owners
      </Link>
      {isPending || !session ? (
        <Link href="/login" className={linkClassName}>
          Log in
        </Link>
      ) : (
        <>
          <Link href="/dashboard" className={linkClassName}>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={signOut}
            className={`${linkClassName} cursor-pointer`}
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  );
}
