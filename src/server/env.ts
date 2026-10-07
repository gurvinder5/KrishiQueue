import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional().default("3000"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/krishiqueue?schema=public",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-krishiqueue-key-minimum-32-chars-length",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  NODE_ENV: (process.env.NODE_ENV as any) || "development",
  PORT: process.env.PORT || "3000",
});
