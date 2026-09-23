import { z } from "zod";

/**
 * Shared auth validation (M2, PRD FR-1/FR-3 rule: one schema used by the
 * form and the server; the server is the source of truth).
 *
 * Password floor (8) mirrors `minPasswordLength` in `src/lib/auth.ts` so
 * the form fails fast with the same rule the server enforces.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase().max(255),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** Profile name edit (dashboard account page). */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

/**
 * Password change (dashboard account page). The confirm field is client-only
 * — Better Auth's `/change-password` takes currentPassword + newPassword.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Those passwords don't match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
