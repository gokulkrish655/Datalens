import { z } from 'zod';

export const emailSchema = z.string().email();
export const urlSchema = z.string().url();
