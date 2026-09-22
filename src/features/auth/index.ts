/**
 * Auth feature boundary (PRD §12: cross-feature calls go through index).
 */
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { LoginForm } from "./components/login-form";
export { RegisterForm } from "./components/register-form";
export { ResetPasswordForm } from "./components/reset-password-form";
export type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./schemas";
export {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";
