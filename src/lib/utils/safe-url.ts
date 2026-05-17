const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

const POSTGREST_SEARCH_FORBIDDEN = new Set(
  "%_*(),.<>!=&|,_".split("")
);

/** Strip characters that break PostgREST filters (no regex on user input). */
export function sanitizePostgrestSearch(input: string, maxLen = 100): string {
  const trimmed = input.slice(0, maxLen);
  let out = "";
  for (const ch of trimmed) {
    if (!POSTGREST_SEARCH_FORBIDDEN.has(ch)) out += ch;
  }
  return out;
}

/** Parse URL and require https. */
export function parseHttpsUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (h.startsWith("169.254.")) return true;
  return false;
}

/** Safe https href for user-controlled document / external links. */
export function isAllowedExternalHref(
  url: string | null | undefined
): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return undefined;
  }
  const parsed = parseHttpsUrl(trimmed);
  if (!parsed) return undefined;
  if (isPrivateOrLocalHost(parsed.hostname)) return undefined;
  return trimmed;
}

/** Validate Instagram post/reel URL; returns normalized https URL or null. */
export function validateInstagramPostUrl(raw: string): string | null {
  const u = parseHttpsUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (!INSTAGRAM_HOSTS.has(host)) return null;
  if (!/^\/(p|reel|reels)\/[^/]+\/?$/i.test(u.pathname)) return null;
  const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
  return `https://${host}${path}`;
}

const MAX_OG_HTML_BYTES = 512 * 1024;

/** Fetch Instagram OG HTML with SSRF protections (allowlisted host, manual redirects). */
export async function fetchInstagramOgHtml(normalizedPostUrl: string): Promise<string | null> {
  let current = normalizedPostUrl;
  for (let hop = 0; hop < 5; hop++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);
    try {
      const res = await fetch(current, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept: "text/html",
        },
        redirect: "manual",
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        const next = validateInstagramPostUrl(
          new URL(location, current).href
        );
        if (!next) return null;
        current = next;
        continue;
      }

      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_OG_HTML_BYTES) return null;
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
  return null;
}
