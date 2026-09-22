import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions accept 5 MB image uploads (default cap is 1 MB; the
  // extra megabyte covers multipart framing overhead).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    // Listing images load only from our Cloudinary cloud (ADR 0004).
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
