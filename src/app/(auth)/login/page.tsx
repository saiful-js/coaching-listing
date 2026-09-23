import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm, ResendVerificationForm } from "@/features/auth";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata = {
  title: "Log in",
  description: "Log in to manage your coaching listings.",
};

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }
  const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        Log in
      </h1>
      <div className="mt-6">
        <LoginForm googleEnabled={googleEnabled} />
      </div>
      <details className="mt-6 rounded-sm border border-line bg-paper-raised p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Need a new verification link?
        </summary>
        <div className="mt-4">
          <ResendVerificationForm />
        </div>
      </details>
      <p className="mt-6 text-sm text-ink-soft">
        No account yet?{" "}
        <Link href="/register" className="underline underline-offset-4">
          Create one
        </Link>{" "}
        ·{" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}
