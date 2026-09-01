import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js isn't on Next's default server-externals list, so without this
  // Turbopack bundles its main-thread entry point and mangles some of its internal
  // require()s. The actual worker-thread code (loaded only via a runtime path, which
  // Vercel's build can't trace/deploy at all -- see ocr-data/tesseract-worker/'s own
  // comments) is vendored into this app's own source instead of relying on
  // tesseract.js's copy, so this only needs to cover the main thread side.
  serverExternalPackages: ["tesseract.js"],
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
