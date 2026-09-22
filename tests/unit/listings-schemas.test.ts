import { describe, expect, it } from "vitest";
import {
  createCoachingSchema,
  updateCoachingSchema,
} from "@/features/listings/schemas";

const VALID = {
  name: "Shiddhirganj Ideal Coaching",
  areaId: "area-1",
  addressLine: "12 Mizmizi Road, Siddhirganj",
  description:
    "SSC and HSC coaching with small batches and weekly model tests for all students.",
  categoryIds: ["cat-1", "cat-2"],
  phone: "01712345678",
  whatsapp: "+8801812345678",
  email: "hello@example.com",
  facebookUrl: "https://www.facebook.com/idealcoaching",
};

describe("listing schemas (src/features/listings/schemas.ts)", () => {
  it("accepts a fully valid listing", () => {
    expect(createCoachingSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects short names, addresses, and descriptions", () => {
    expect(
      createCoachingSchema.safeParse({ ...VALID, name: "AB" }).success,
    ).toBe(false);
    expect(
      createCoachingSchema.safeParse({ ...VALID, addressLine: "12" }).success,
    ).toBe(false);
    expect(
      createCoachingSchema.safeParse({ ...VALID, description: "Too short" })
        .success,
    ).toBe(false);
  });

  it("requires 1–5 categories", () => {
    expect(
      createCoachingSchema.safeParse({ ...VALID, categoryIds: [] }).success,
    ).toBe(false);
    expect(
      createCoachingSchema.safeParse({
        ...VALID,
        categoryIds: ["a", "b", "c", "d", "e", "f"],
      }).success,
    ).toBe(false);
  });

  it("rejects bad phones and non-Facebook URLs", () => {
    expect(
      createCoachingSchema.safeParse({ ...VALID, phone: "01234567890" })
        .success,
    ).toBe(false);
    expect(
      createCoachingSchema.safeParse({
        ...VALID,
        facebookUrl: "https://example.com/page",
      }).success,
    ).toBe(false);
    expect(
      createCoachingSchema.safeParse({
        ...VALID,
        facebookUrl: "http://facebook.com/page",
      }).success,
    ).toBe(false);
  });

  it("update schema mirrors create (full-object edit)", () => {
    expect(updateCoachingSchema.safeParse(VALID).success).toBe(true);
    expect(
      updateCoachingSchema.safeParse({ ...VALID, name: "AB" }).success,
    ).toBe(false);
  });
});
