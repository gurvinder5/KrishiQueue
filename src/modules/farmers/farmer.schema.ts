import { z } from "zod";

export const updateFarmerProfileSchema = z.object({
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  taluk: z.string().optional(),
  village: z.string().min(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  bankAccountNo: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
});

export const addLandSchema = z.object({
  surveyNumber: z.string().min(1, "Survey number is required"),
  areaAcres: z.number().positive("Land area must be positive"),
  state: z.string().min(2),
  district: z.string().min(2),
  village: z.string().min(2),
});

export const addLandCropSchema = z.object({
  cropId: z.string().uuid("Invalid crop ID"),
  season: z.string().min(2, "Season is required (e.g. RABI_2026)"),
  sownAreaAcres: z.number().positive("Sown area must be positive"),
  estimatedYieldQuintals: z.number().positive().optional(),
});

export type UpdateFarmerProfileInput = z.infer<typeof updateFarmerProfileSchema>;
export type AddLandInput = z.infer<typeof addLandSchema>;
export type AddLandCropInput = z.infer<typeof addLandCropSchema>;
