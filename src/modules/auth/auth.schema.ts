import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian mobile number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  role: z.nativeEnum(Role).default(Role.FARMER),
  farmerDetails: z
    .object({
      farmerIdNumber: z.string().optional(),
      state: z.string().min(2, "State is required"),
      district: z.string().min(2, "District is required"),
      taluk: z.string().optional(),
      village: z.string().min(2, "Village is required"),
      pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
      bankAccountNo: z.string().optional(),
      bankIfsc: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian mobile number"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
