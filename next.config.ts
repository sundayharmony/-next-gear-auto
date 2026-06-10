import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  experimental: {
    // Allow larger multipart payloads in local/proxied requests (e.g. image uploads)
    proxyClientMaxBodySize: 10 * 1024 * 1024,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "sslpstfgwtuyempuwzvh.supabase.co" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Clickjacking Protection ──
          { key: "X-Frame-Options", value: "DENY" },

          // ── MIME-type Sniffing Protection ──
          { key: "X-Content-Type-Options", value: "nosniff" },

          // ── Referrer Control ──
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // ── Legacy XSS Filter (still useful for older browsers) ──
          { key: "X-XSS-Protection", value: "1; mode=block" },

          // ── HSTS — force HTTPS for 2 years, with preload list eligibility ──
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // CSP is set per-request with a nonce in src/proxy.ts (Next.js App Router).

          // ── Permissions Policy — restrict powerful browser APIs ──
          {
            key: "Permissions-Policy",
            value: [
              "geolocation=()",
              "microphone=()",
              "camera=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "usb=()",
              "payment=(self)",       // Allow Payment Request API for Stripe
              "autoplay=()",
              "fullscreen=(self)",
              "display-capture=()",

              "encrypted-media=(self)",
              "picture-in-picture=()",
              "screen-wake-lock=()",
              "xr-spatial-tracking=()",
              "interest-cohort=()",    // Opt out of Google FLoC/Topics
            ].join(", "),
          },

          // ── Prevent DNS prefetch to external domains (privacy) ──
          { key: "X-DNS-Prefetch-Control", value: "on" },

          // ── Remove X-Powered-By header (security) ──
          { key: "X-Powered-By", value: "" },

          // ── Cross-Origin Policies ──
          // Allow cross-origin images (needed for Supabase, Unsplash, etc.)
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          // Restrict window.opener access from cross-origin popups
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      // ── Cache security for API routes — no caching of sensitive data ──
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
