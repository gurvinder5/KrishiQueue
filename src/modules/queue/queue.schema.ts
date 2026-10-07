import { z } from "zod";
import { TokenStatus } from "@prisma/client";

export const callNextTokenSchema = z.object({
  centerId: z.string().uuid("Invalid center ID"),
  counterNumber: z.string().min(1, "Counter or gate identifier is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateTokenStatusSchema = z.object({
  status: z.nativeEnum(TokenStatus),
  counterNumber: z.string().optional(),
});

export const liveQueueQuerySchema = z.object({
  centerId: z.string().uuid("Invalid center ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CallNextTokenInput = z.infer<typeof callNextTokenSchema>;
export type UpdateTokenStatusInput = z.infer<typeof updateTokenStatusSchema>;
export type LiveQueueQueryInput = z.infer<typeof liveQueueQuerySchema>;
