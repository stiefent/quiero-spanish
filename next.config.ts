import type { NextConfig } from "next";

// `STATIC_EXPORT=1 npm run build` produces a self-contained static site in
// ./out (relative asset paths) for quick previews. Normal builds deploy to Vercel.
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isExport
  ? { output: "export", assetPrefix: ".", images: { unoptimized: true } }
  : {};

export default nextConfig;
