import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js isn't on Next's default server-externals list, so without this
  // Turbopack bundles it and mangles the require() it uses internally to locate its
  // own worker-script file at runtime -- surfaces as "Cannot find module
  // '/ROOT/node_modules/tesseract.js/src/worker-script/node/index.js'" the first
  // time any OCR path (dl-ocr.ts, plate-ocr.ts) actually runs.
  serverExternalPackages: ["tesseract.js"],
  // Vercel's serverless output tracer doesn't follow the computed require() paths
  // tesseract.js's own Node worker-script uses internally to load its sibling
  // files, so it silently drops most of the package from the deployed function --
  // surfaces at runtime as "Cannot find module '/var/task/.../worker-script[/...]'"
  // the first time OCR actually runs, well after a clean build/deploy. Force the
  // whole package (plus tesseract.js-core, which it loads for the wasm binaries)
  // into every route's trace.
  // Same tracing gap for the bundled language model, read via a process.cwd()-based
  // path (lib/dl-ocr.ts, lib/plate-ocr.ts) that the tracer can't follow either.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./ocr-data/**/*",
    ],
  },
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
