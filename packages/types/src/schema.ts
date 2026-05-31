import { z } from 'zod';

export const lookupDomainSchema = z.object({ email: z.string().email() });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });
export const createAccessRequestSchema = z.object({ tableId: z.string().uuid(), justification: z.string().min(20), durationDays: z.number().int().positive() });
export const listDatabasesSchema = z.object({ status: z.enum(['PENDING', 'CONNECTED', 'ERROR', 'SYNCING', 'PAUSED']).optional() });
