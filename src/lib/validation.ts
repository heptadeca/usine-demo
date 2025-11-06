import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createBotSchema = z.object({
  name: z.string().min(1, 'Bot name is required').max(100, 'Bot name too long'),
});

export const updateBotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const createDatasourceSchema = z.object({
  type: z.enum(['text', 'csv', 'url', 'pdf']),
  url: z.string().url().optional(),
  text: z.string().optional(),
  source_filename: z.string().optional(),
});

export const createSessionSchema = z.object({
  bot_id: z.string().uuid('Invalid bot ID'),
});

export const chatMessageSchema = z.object({
  bot_id: z.string().uuid('Invalid bot ID'),
  session_id: z.string().uuid('Invalid session ID'),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

export const reindexSchema = z.object({
  force: z.boolean().optional(),
});
