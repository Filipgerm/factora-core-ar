import { z } from "zod";

const uuidLike = z.string().uuid();

export const signUpRequestSchema = z.object({
  username: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const googleAuthRequestSchema = z.object({
  id_token: z.string().min(1),
});

export const refreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string(),
  new_password: z.string().min(8),
  confirm_password: z.string(),
});

export const changePasswordRequestSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8),
  confirm_password: z.string(),
});

export const phoneVerificationRequestSchema = z.object({
  phone_number: z.string().min(1),
});

export const emailVerificationCodeRequestSchema = z.object({
  verification_id: z.string(),
  code: z.string().min(4).max(8),
});

export const phoneVerificationCodeRequestSchema = z.object({
  verification_id: z.string(),
  code: z.string().min(4).max(8),
});

export const userProfileResponseSchema = z.object({
  user_id: uuidLike,
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  organization_id: uuidLike.nullish(),
  email_verified: z.boolean().optional().default(false),
  phone_verified: z.boolean().optional().default(false),
});

export const authResponseSchema = userProfileResponseSchema.extend({
  access_token: z.string(),
  token_type: z.string().default("bearer"),
  expires_at: z.coerce.date(),
  /** Present only after backend Phase 2 fix; optional for forward compatibility */
  refresh_token: z.string().optional(),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const verificationInitResponseSchema = z.object({
  verification_id: z.string(),
  message: z.string(),
});

export type SignUpRequest = z.infer<typeof signUpRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type GoogleAuthRequest = z.infer<typeof googleAuthRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type VerificationInitResponse = z.infer<
  typeof verificationInitResponseSchema
>;
