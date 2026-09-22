/**
 * Render-time guard for user-supplied Facebook URLs (defense in depth).
 *
 * Writes are already restricted to https Facebook hosts by the Zod schema,
 * but React does not sanitize `href` — a single non-conforming row (legacy,
 * direct DB write, future relaxation) would otherwise become stored XSS.
 * Never render `facebookUrl` without passing it through here.
 */
export function safeFacebookUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const ok =
    host === "facebook.com" ||
    host === "fb.com" ||
    host.endsWith(".facebook.com") ||
    host.endsWith(".fb.com");
  return ok ? url : null;
}
