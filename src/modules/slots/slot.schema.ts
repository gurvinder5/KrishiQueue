import { z } from "zod";

export const generateSlotsSchema = z.object({
  centerId: z.string().uuid("Invalid center ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  slotCapacity: z.number().int().positive().optional(),
});

export const querySlotsSchema = z.object({
  centerId: z.string().uuid("Invalid center ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>;
export type QuerySlotsInput = z.infer<typeof querySlotsSchema>;
