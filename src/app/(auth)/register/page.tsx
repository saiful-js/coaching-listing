import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata = {
  title: "Create account",
  description: "Register to list your coaching centre in Narayanganj.",
};

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }
  const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">For coaching owners</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        Create account
      </h1>
      <div className="mt-6">
        <RegisterForm googleEnabled={googleEnabled} />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Already registered?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
