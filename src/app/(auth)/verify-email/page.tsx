import Link from "next/link";

export const metadata = {
  title: "Verify your email",
  description: "Confirm your email address to finish registration.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const verified = params.verified === "1";
  // Any error value means the link is dead — say so with a way forward.
  const error = typeof params.error === "string";
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">One last step</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        {verified ? "Email verified" : "Check your inbox"}
      </h1>
      {verified ? (
        <p className="mt-4 text-sm text-ink-soft">
          Your email is confirmed. Log in to create your first listing.
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-800">
          That verification link is invalid or expired. Log in to request a new
          one.
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          We sent a verification link to your email address. Click it to verify
          — then you can log in and create your first listing.
        </p>
      )}
      <Link href="/login" className="btn btn-secondary mt-6">
        Go to login
      </Link>
    </div>
  );
}
