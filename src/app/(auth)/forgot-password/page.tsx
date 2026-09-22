import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth";

export const metadata = {
  title: "Forgot password",
  description: "Request a single-use password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        Forgot password
      </h1>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
