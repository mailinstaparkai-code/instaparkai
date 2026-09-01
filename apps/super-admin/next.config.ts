import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js isn't on Next's default server-externals list, so without this
  // Turbopack bundles it and mangles the require() it uses internally to locate its
  // own worker-script file at runtime -- surfaces as "Cannot find module
  // '/ROOT/node_modules/tesseract.js/src/worker-script/node/index.js'" the first
  // time any OCR path (dl-ocr.ts, plate-ocr.ts) actually runs.
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
