import { z } from 'zod';

/** Website sign-up and sign-in for members. The phone number is the account id; email is optional. */
const registerFields = {
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().max(200).default(''),
  password: z.string().min(1).max(200),
  captcha: z.unknown().optional(),
  website: z.string().max(0).default(''), // honeypot
};

export const memberActionInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('register'), ...registerFields }).strict(),
  z
    .object({
      action: z.literal('login'),
      phone: z.string().trim().min(8).max(20),
      password: z.string().min(1).max(200),
    })
    .strict(),
  z.object({ action: z.literal('logout') }).strict(),
  z
    .object({
      action: z.literal('profile'),
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().max(200).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('password'),
      current: z.string().min(1).max(200),
      next: z.string().min(1).max(200),
    })
    .strict(),
]);
export type MemberActionInput = z.infer<typeof memberActionInput>;

export const MEMBER_COOKIE = 'g3d_member';
export const MEMBER_SESSION_SECONDS = 30 * 24 * 3600;
