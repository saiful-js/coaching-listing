/**
 * Auth feature boundary (PRD §12: cross-feature calls go through index).
 */
export { ForgotPasswordForm } from "./components/forgot-password-form";
export {
  captchaHeaders,
  Field,
  FormError,
  FormNote,
  TextInput,
} from "./components/form-fields";
export { LoginForm } from "./components/login-form";
export { RegisterForm } from "./components/register-form";
export { ResendVerificationForm } from "./components/resend-verification-form";
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
