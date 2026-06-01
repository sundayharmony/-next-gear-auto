const SITE_ORIGINS = [
  "https://rentnextgearauto.com",
  "https://www.rentnextgearauto.com",
];

/**
 * Per-request CSP for HTML responses. Nonce is generated in src/proxy.ts and
 * forwarded as the x-nonce request header for Next.js script/style tagging.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://js.stripe.com",
    "https://maps.googleapis.com",
    "https://www.googletagmanager.com",
    "https://www.instagram.com",
    "https://*.instagram.com",
    "https://va.vercel-scripts.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const styleSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ].join(" ");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...SITE_ORIGINS,
    "https://images.unsplash.com",
    "https://via.placeholder.com",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://*.gstatic.com",
    "https://*.stripe.com",
    "https://*.supabase.co",
    "https://*.cdninstagram.com",
    "https://*.fbcdn.net",
    "https://*.instagram.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    "blob:",
    ...SITE_ORIGINS,
    "https://api.stripe.com",
    "https://checkout.stripe.com",
    "https://*.supabase.co",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://places.googleapis.com",
    "https://*.instagram.com",
    "https://vitals.vercel-insights.com",
    "https://va.vercel-scripts.com",
  ].join(" ");

  const frameSrc = [
    "'self'",
    "https://js.stripe.com",
    "https://checkout.stripe.com",
    "https://www.google.com",
    "https://maps.google.com",
    "https://www.instagram.com",
    "https://*.instagram.com",
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** HTML/document routes get nonce CSP; APIs and static assets do not. */
export function shouldApplyDocumentCsp(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname === "/favicon.ico") return false;
  if (pathname === "/icon.png" || pathname === "/apple-icon.png") return false;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  if (pathname === "/manifest.json") return false;
  if (pathname.startsWith("/images/")) return false;
  return true;
}
