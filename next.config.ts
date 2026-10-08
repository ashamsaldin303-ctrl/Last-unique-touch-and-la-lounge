import type { NextConfig } from "next";

// CSP is deliberately DEFERRED (audit r3-r1 L3 — decision record):
// - The app is a client-rendered SPA with Three.js WebGL scenes, inline
//   <style> injection (framer-motion / Tailwind runtime tweaks), and
//   eval-adjacent tooling in dev; a naive `script-src 'self'` would break
//   Next's inline bootstrap unless paired with nonce infrastructure.
// - Doing it right needs per-request nonces (middleware or a custom server
//   for the standalone build) plus a report-only rollout phase — a project
//   of its own, not a one-line header.
// - Until then, the layered mitigations in place (X-Content-Type-Options,
//   X-Frame-Options, no X-Powered-By, zod-validated JSON APIs, React text
//   node rendering for all UGC, no dangerouslySetInnerHTML outside an unused
//   scaffold) cap the realistic XSS blast radius.
// Revisit when nonce plumbing lands; do NOT add a static CSP header here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
