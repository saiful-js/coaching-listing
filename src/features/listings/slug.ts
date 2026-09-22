const SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SUFFIX_CHARS[b % SUFFIX_CHARS.length]).join(
    "",
  );
}

/**
 * URL slug, generated once at creation and never changed (PRD FR-3):
 * `slugify(name) || "coaching"` + `-` + 6 random chars.
 */
export function generateSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "coaching";
  return `${base}-${randomSuffix(6)}`;
}
