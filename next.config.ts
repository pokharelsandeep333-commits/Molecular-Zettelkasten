import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for @xenova/transformers on the server (Next.js 15+)
  serverExternalPackages: ["@xenova/transformers", "sharp"],
  turbopack: {},
};

export default nextConfig;
