import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft">
        That page doesn&apos;t exist or may have moved. Try the directory
        instead.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/coachings" className="btn btn-primary">
          Browse coaching centres
        </Link>
        <Link href="/" className="btn btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}
