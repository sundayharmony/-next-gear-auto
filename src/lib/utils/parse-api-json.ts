/** Parse admin/API JSON responses without throwing on HTML error pages. */
export async function parseApiJsonResponse(
  res: Response
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ").trim();
    return {
      ok: false,
      message: res.ok
        ? "Unexpected server response format"
        : `Server error (${res.status})${snippet ? `: ${snippet}` : ""}`,
    };
  }

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      message: `Invalid JSON response (${res.status})`,
    };
  }
}
