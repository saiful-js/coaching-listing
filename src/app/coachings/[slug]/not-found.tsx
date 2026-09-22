import Link from "next/link";

export default function CoachingNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        This listing isn&apos;t available
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
        It may have been removed, or the address is wrong. Only reviewed,
        published listings appear here.
      </p>
      <Link href="/coachings" className="btn btn-secondary mt-6">
        Browse all centres
      </Link>
    </div>
  );
}
