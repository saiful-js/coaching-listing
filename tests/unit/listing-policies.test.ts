import { describe, expect, it } from "vitest";
import {
  canArchive,
  canDelete,
  canEdit,
  canModerate,
  canSubmit,
  isTransitionAllowed,
} from "@/features/listings/policies";
import type { ListingStatus } from "@/generated/prisma/client";

describe("listing transition matrix (src/features/listings/policies.ts)", () => {
  const allowed: [ListingStatus, ListingStatus][] = [
    ["DRAFT", "PENDING"],
    ["REJECTED", "PENDING"],
    ["PENDING", "PUBLISHED"],
    ["PENDING", "REJECTED"],
    ["PUBLISHED", "ARCHIVED"],
    ["DRAFT", "ARCHIVED"],
  ];
  for (const [from, to] of allowed) {
    it(`allows ${from} → ${to}`, () => {
      expect(isTransitionAllowed(from, to)).toBe(true);
    });
  }

  const denied: [ListingStatus, ListingStatus][] = [
    ["DRAFT", "PUBLISHED"],
    ["DRAFT", "REJECTED"],
    ["PENDING", "ARCHIVED"],
    ["PENDING", "DRAFT"],
    ["PUBLISHED", "PENDING"],
    ["PUBLISHED", "REJECTED"],
    ["REJECTED", "PUBLISHED"],
    ["ARCHIVED", "PUBLISHED"],
    ["ARCHIVED", "PENDING"],
  ];
  for (const [from, to] of denied) {
    it(`denies ${from} → ${to}`, () => {
      expect(isTransitionAllowed(from, to)).toBe(false);
    });
  }
});

describe("listing policies", () => {
  it("owners edit drafts/rejected/pending/published, never archived", () => {
    for (const status of [
      "DRAFT",
      "REJECTED",
      "PENDING",
      "PUBLISHED",
    ] as const) {
      expect(canEdit("OWNER", true, status)).toBe(true);
    }
    expect(canEdit("OWNER", true, "ARCHIVED")).toBe(false);
    expect(canEdit("OWNER", false, "DRAFT")).toBe(false);
  });

  it("owners submit drafts and resubmit rejected listings", () => {
    expect(canSubmit("OWNER", true, "DRAFT")).toBe(true);
    expect(canSubmit("OWNER", true, "REJECTED")).toBe(true);
    expect(canSubmit("OWNER", true, "PENDING")).toBe(false);
    expect(canSubmit("OWNER", false, "DRAFT")).toBe(false);
    // Admins moderate others' listings but can still submit their own.
    expect(canSubmit("ADMIN", true, "DRAFT")).toBe(true);
  });

  it("owners archive drafts and published listings only", () => {
    expect(canArchive("OWNER", true, "DRAFT")).toBe(true);
    expect(canArchive("OWNER", true, "PUBLISHED")).toBe(true);
    expect(canArchive("OWNER", true, "PENDING")).toBe(false);
    expect(canArchive("OWNER", false, "PUBLISHED")).toBe(false);
  });

  it("only admins moderate", () => {
    expect(canModerate("ADMIN")).toBe(true);
    expect(canModerate("OWNER")).toBe(false);
  });

  it("owners delete their own listings, admins delete any", () => {
    expect(canDelete("OWNER", true)).toBe(true);
    expect(canDelete("OWNER", false)).toBe(false);
    expect(canDelete("ADMIN", false)).toBe(true);
    expect(canDelete("ADMIN", true)).toBe(true);
  });
});
