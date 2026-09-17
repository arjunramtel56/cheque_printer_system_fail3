/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Security headers.
//
// This is a static, frontend-only app: no API routes, no cookies set by the
// server, no user-generated HTML. The headers below are sized to that reality —
// they harden the browser side (framing, MIME sniffing, referrer leakage,
// malicious permissive features) without breaking Next.js's own inline runtime
// scripts, which is why the CSP allows 'unsafe-inline' for scripts while still
// locking down object/frame/base and every other directive.
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      // Next.js injects inline runtime scripts; allow them explicitly.
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs nothing from these APIs; deny by default.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Dev server is plain HTTP, so HSTS is emitted only for production builds
  // (where it is served over TLS). HSTS on http://localhost is ignored by
  // browsers, but keeping it out of dev avoids confusing curl output.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
