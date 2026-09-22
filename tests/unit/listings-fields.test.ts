import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/features/listings/phone";
import { generateSlug } from "@/features/listings/slug";

describe("normalizePhone (src/features/listings/phone.ts)", () => {
  it("normalizes local, 880-prefixed, and +-prefixed numbers", () => {
    expect(normalizePhone("01712345678")).toBe("+8801712345678");
    expect(normalizePhone("8801712345678")).toBe("+8801712345678");
    expect(normalizePhone("+8801712345678")).toBe("+8801712345678");
    expect(normalizePhone("01300000000")).toBe("+8801300000000");
  });

  it("rejects non-Bangladeshi-mobile input", () => {
    for (const bad of [
      "01234567890",
      "+8801212345678",
      "12345",
      "",
      "01712-345678",
    ]) {
      expect(() => normalizePhone(bad), bad).toThrow(/phone/i);
    }
  });
});

describe("generateSlug (src/features/listings/slug.ts)", () => {
  it("slugifies the name plus 6 random chars", () => {
    expect(generateSlug("Green Coaching!")).toMatch(
      /^green-coaching-[a-z0-9]{6}$/,
    );
  });

  it("falls back to coaching for names with no alphanumeric chars", () => {
    expect(generateSlug("!!!")).toMatch(/^coaching-[a-z0-9]{6}$/);
  });

  it("generates distinct slugs for the same name", () => {
    expect(generateSlug("Same Name")).not.toBe(generateSlug("Same Name"));
  });
});
