import { z } from "zod";
import { phoneSchema } from "@/features/listings/phone";

/**
 * Shared listing validation (PRD FR-3: one schema for form + server, server
 * is the source of truth). Existence checks (area, categories) and phone
 * normalization run server-side in `service.ts`.
 */
const facebookUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine(
    (value) => {
      if (!value) {
        return true;
      }
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return false;
      }
      if (url.protocol !== "https:") {
        return false;
      }
      const host = url.hostname.toLowerCase();
      return (
        host === "facebook.com" ||
        host === "fb.com" ||
        host.endsWith(".facebook.com") ||
        host.endsWith(".fb.com")
      );
    },
    { message: "Expected an https Facebook page URL" },
  );

const listingFields = {
  name: z.string().trim().min(3).max(120),
  areaId: z.string().min(1),
  addressLine: z.string().trim().min(5).max(250),
  description: z.string().trim().min(30).max(5000),
  categoryIds: z.array(z.string().min(1)).min(1).max(5),
  phone: phoneSchema,
  whatsapp: phoneSchema.optional(),
  email: z.email().trim().toLowerCase().max(255).optional(),
  facebookUrl: facebookUrlSchema,
};

export const createCoachingSchema = z.object(listingFields);

/** Full-object edit: same shape as create; slug/owner/status handled by the service. */
export const updateCoachingSchema = z.object(listingFields);

export type CreateCoachingInput = z.infer<typeof createCoachingSchema>;
export type UpdateCoachingInput = z.infer<typeof updateCoachingSchema>;
