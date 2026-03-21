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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Removed unsafe-eval; kept unsafe-inline only because Stripe.js and Next.js require it
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://www.instagram.com https://*.instagram.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://via.placeholder.com https://maps.googleapis.com https://*.stripe.com https://*.supabase.co https://*.cdninstagram.com https://*.fbcdn.net https://*.instagram.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Restricted connect-src to only known API domains
              "connect-src 'self' blob: https://api.stripe.com https://checkout.stripe.com https://*.supabase.co https://maps.googleapis.com https://*.instagram.com",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.google.com https://maps.google.com https://www.instagram.com https://*.instagram.com",
              // Prevent form submissions to external origins
              "form-action 'self'",
              // Prevent embedding this site in frames on other domains
              "frame-ancestors 'none'",
              // Only load from HTTPS (except self and data:)
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
