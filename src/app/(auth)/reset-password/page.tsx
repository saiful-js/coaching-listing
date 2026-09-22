import { ResetPasswordForm } from "@/features/auth";

export const metadata = {
  title: "Set new password",
  description: "Choose a new password with your reset link.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : (raw ?? null);
  // Any error value means the link is dead — show the invalid state.
  const invalid = typeof params.error === "string";
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        Set new password
      </h1>
      <div className="mt-6">
        <ResetPasswordForm token={invalid ? null : token} />
      </div>
    </div>
  );
}
