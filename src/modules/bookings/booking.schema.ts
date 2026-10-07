import { z } from "zod";
import { VehicleType, BookingStatus } from "@prisma/client";

export const createBookingSchema = z.object({
  slotId: z.string().uuid("Invalid slot ID"),
  cropId: z.string().uuid("Invalid crop ID"),
  farmerProfileId: z.string().uuid().optional(), // Injected from auth context or passed by operator
  estimatedQuantityQuintals: z.number().positive("Estimated quantity must be greater than 0"),
  vehicleType: z.nativeEnum(VehicleType).default(VehicleType.TRACTOR_TROLLEY),
  vehicleNumber: z.string().min(3, "Vehicle number is required").max(20),
  driverName: z.string().optional(),
  driverPhone: z.string().regex(/^[6-9]\d{9}$/, "Driver phone must be a valid 10-digit number").optional().or(z.literal("")),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required").max(500),
});

export const queryBookingsSchema = z.object({
  farmerId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type QueryBookingsInput = z.infer<typeof queryBookingsSchema>;
