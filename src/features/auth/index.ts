/**
 * Auth feature boundary (PRD §12: cross-feature calls go through index).
 */
export { AccountSettings } from "./components/account-settings";
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
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "./schemas";
export {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schemas";
