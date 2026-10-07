import { z } from "zod";
import { QualityGrade, PaymentStatus } from "@prisma/client";

export const createProcurementRecordSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  grossWeightKg: z.number().positive("Gross weight must be positive"),
  tareWeightKg: z.number().nonnegative("Tare weight cannot be negative"),
  moisturePercent: z.number().min(0).max(100),
  foreignMatterPercent: z.number().min(0).max(100).default(0.5),
  qualityGrade: z.nativeEnum(QualityGrade).default(QualityGrade.GRADE_A),
  customRatePerQuintal: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentReference: z.string().optional(),
});

export const queryProcurementRecordsSchema = z.object({
  centerId: z.string().uuid().optional(),
  farmerId: z.string().uuid().optional(),
  cropId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProcurementRecordInput = z.infer<typeof createProcurementRecordSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type QueryProcurementRecordsInput = z.infer<typeof queryProcurementRecordsSchema>;
