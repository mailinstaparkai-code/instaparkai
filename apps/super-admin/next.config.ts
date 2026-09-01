import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Check-in/handover photo uploads go through Server Actions -- client-side
    // compression keeps individual files small, but a few of them together can
    // exceed the 1MB default.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
