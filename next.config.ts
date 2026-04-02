import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

          // ── Content Security Policy ──
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-inline required for Stripe.js and Next.js inline scripts
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://www.instagram.com https://*.instagram.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://via.placeholder.com https://maps.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://*.stripe.com https://*.supabase.co https://*.cdninstagram.com https://*.fbcdn.net https://*.instagram.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Restricted connect-src to only known API domains
              "connect-src 'self' blob: https://api.stripe.com https://checkout.stripe.com https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com https://*.instagram.com",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.google.com https://maps.google.com https://www.instagram.com https://*.instagram.com",
              // Prevent object/embed/applet elements
              "object-src 'none'",
              // Prevent form submissions to external origins
              "form-action 'self'",
              // Prevent embedding this site in frames on other domains
              "frame-ancestors 'none'",
              // Only load from HTTPS
              "upgrade-insecure-requests",
              // Restrict base tag to same origin
              "base-uri 'self'",
            ].join("; "),
          },

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
              "document-domain=()",
              "encrypted-media=(self)",
              "picture-in-picture=()",
              "screen-wake-lock=()",
              "xr-spatial-tracking=()",
              "interest-cohort=()",    // Opt out of Google FLoC/Topics
            ].join(", "),
          },

          // ── Prevent DNS prefetch to external domains (privacy) ──
          { key: "X-DNS-Prefetch-Control", value: "on" },

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

export default nextConfig;
