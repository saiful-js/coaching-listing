"use client";

import "./globals.css";

/**
 * Catches errors thrown by the root layout itself. Replaces the root layout,
 * so it must render its own <html>/<body> and load global styles.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-paper px-4 text-center text-ink">
        <div>
          <p className="eyebrow">Something went wrong</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            The app hit an unexpected error
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft">
            Please try again. If it keeps happening, come back in a little
            while.
          </p>
          <button
            type="button"
            onClick={retry}
            className="btn btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
