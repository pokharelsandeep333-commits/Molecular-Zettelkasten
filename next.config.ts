import type { NextConfig } from "next";

// Headers for every response. The per-request CSP (with its nonce) is added by
// src/proxy.ts; /api/raw sets its own framing rules so PDFs can be embedded.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Firebase signInWithPopup needs the popup to message back to this window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  // Native ONNX/sharp binaries must be required at runtime, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  turbopack: {},
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/((?!api/raw/).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // Authenticated JSON must never be stored by shared caches.
        source: "/api/((?!raw/).*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
