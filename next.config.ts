import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Listing images load only from our Cloudinary cloud (ADR 0004).
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
