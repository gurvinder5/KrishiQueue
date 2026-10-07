import { z } from "zod";

export const createCenterSchema = z.object({
  code: z.string().min(3).max(20),
  name: z.string().min(3).max(150),
  address: z.string().min(5),
  village: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  dailyCapacityQuintals: z.number().positive().default(5000),
  maxVehiclesPerHour: z.number().int().positive().default(15),
  operatingStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default("08:00"),
  operatingEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default("18:00"),
  slotDurationMinutes: z.number().int().positive().default(60),
  defaultSlotCapacity: z.number().int().positive().default(10),
  cropIds: z.array(z.string().uuid()).optional(),
});

export const updateCenterSchema = createCenterSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const centerFilterSchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  cropId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export type CreateCenterInput = z.infer<typeof createCenterSchema>;
export type UpdateCenterInput = z.infer<typeof updateCenterSchema>;
export type CenterFilterInput = z.infer<typeof centerFilterSchema>;
