import { describe, expect, it } from "vitest";
import { safeFacebookUrl } from "@/features/listings/facebook";

describe("safeFacebookUrl (src/features/listings/facebook.ts)", () => {
  it("passes https Facebook URLs", () => {
    expect(safeFacebookUrl("https://www.facebook.com/ideal")).toBe(
      "https://www.facebook.com/ideal",
    );
    expect(safeFacebookUrl("https://fb.com/x")).toBe("https://fb.com/x");
    expect(safeFacebookUrl("https://m.facebook.com/x")).toBe(
      "https://m.facebook.com/x",
    );
  });

  it("blocks non-https, non-Facebook, and malformed URLs", () => {
    expect(safeFacebookUrl(null)).toBeNull();
    expect(safeFacebookUrl(undefined)).toBeNull();
    expect(safeFacebookUrl("")).toBeNull();
    expect(safeFacebookUrl("http://facebook.com/x")).toBeNull();
    expect(safeFacebookUrl("https://example.com/x")).toBeNull();
    expect(safeFacebookUrl("https://facebook.com.evil.com/x")).toBeNull();
    expect(safeFacebookUrl("javascript:alert(1)")).toBeNull();
    expect(safeFacebookUrl("not a url")).toBeNull();
  });
});
