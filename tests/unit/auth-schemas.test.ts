import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";

describe("auth schemas (src/features/auth/schemas.ts)", () => {
  it("register requires name, valid email, and password ≥ 8", () => {
    expect(
      registerSchema.safeParse({
        name: "A",
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
    const result = registerSchema.safeParse({
      name: "Nasrin Owner",
      email: "owner@example.com",
      password: "s3cure-pass",
    });
    expect(result.success).toBe(true);
  });

  it("login requires valid email and non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "owner@example.com", password: "" })
        .success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "owner@example.com", password: "x" })
        .success,
    ).toBe(true);
  });

  it("forgot-password requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ email: "owner@example.com" }).success,
    ).toBe(true);
  });

  it("reset requires a token and password ≥ 8", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "", newPassword: "s3cure-pass" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "t", newPassword: "short" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "t", newPassword: "s3cure-pass" })
        .success,
    ).toBe(true);
  });
});
