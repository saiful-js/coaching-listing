import type { ReactNode } from "react";

const inputClassName =
  "h-11 w-full rounded-sm border border-line-strong bg-paper-raised px-3 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest";

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClassName} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" aria-live="assertive" className="text-sm text-red-800">
      {message}
    </p>
  );
}

export function FormNote({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="text-sm text-ink-soft">
      {children}
    </p>
  );
}

/**
 * Turnstile token header for captcha-protected endpoints (docs-prescribed
 * `x-captcha-response`). The widget lands at provisioning time with
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; until then no token exists and the
 * server-side captcha plugin stays uninstalled, so this is a no-op.
 */
export function captchaHeaders(token?: string): {
  fetchOptions?: { headers: Record<string, string> };
} {
  if (!token) {
    return {};
  }
  return { fetchOptions: { headers: { "x-captcha-response": token } } };
}
