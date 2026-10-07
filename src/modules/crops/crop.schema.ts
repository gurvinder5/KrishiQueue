import { z } from "zod";
import { CropCategory } from "@prisma/client";

export const createCropSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(100),
  category: z.nativeEnum(CropCategory).default(CropCategory.CEREALS),
  mspRatePerQuintal: z.number().positive("MSP rate must be positive"),
  procurementSeason: z.string().min(2),
  moistureLimitPercent: z.number().positive().default(12.0),
  foreignMatterLimit: z.number().nonnegative().default(1.0),
});

export const updateCropSchema = createCropSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCropInput = z.infer<typeof createCropSchema>;
export type UpdateCropInput = z.infer<typeof updateCropSchema>;
