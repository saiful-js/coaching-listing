import { z } from "zod";

/**
 * Bangladeshi mobile rule (PRD FR-3): `^(?:\+?88)?01[3-9]\d{8}$`,
 * normalized to `+8801XXXXXXXXX`.
 */
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!BD_MOBILE.test(trimmed)) {
    throw new Error(
      "Invalid phone number: expected a Bangladeshi mobile like 01712345678",
    );
  }
  const digits = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const local = digits.startsWith("88") ? digits.slice(2) : digits;
  return `+880${local.slice(1)}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => BD_MOBILE.test(value), {
    message: "Expected a Bangladeshi mobile like 01712345678",
  })
  .transform((value) => normalizePhone(value));
