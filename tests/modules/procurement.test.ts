import { describe, it, expect, vi } from "vitest";
import { ProcurementService } from "@/modules/procurement/procurement.service";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { QualityGrade, PaymentStatus, BookingStatus } from "@prisma/client";

describe("Procurement Settlement & Moisture Quality Suite", () => {
  it("computes net weight and MSP payout accurately", async () => {
    const grossWeight = 5000;
    const tareWeight = 1000;
    const netWeight = 4000; // 40 quintals
    const mspRate = 2275.0;
    const expectedTotal = 40 * mspRate; // 91000

    const mockBooking = {
      id: "booking-1",
      centerId: "center-1",
      farmerId: "farmer-1",
      cropId: "crop-1",
      bookingReference: "BK-20261015-001",
      crop: { id: "crop-1", name: "Wheat", mspRatePerQuintal: mspRate, moistureLimitPercent: 12.0 },
      farmer: { id: "farmer-1", userId: "user-1", user: { name: "Farmer", phone: "9876543210" } },
      procurementRecord: null,
    };

    const mockTx = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(mockBooking),
        update: vi.fn().mockResolvedValue({ id: "booking-1", status: BookingStatus.COMPLETED }),
      },
      procurementRecord: {
        create: vi.fn().mockImplementation(async ({ data }) => ({ id: "rec-1", ...data })),
      },
      queueToken: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => cb(mockTx));

    const record = await ProcurementService.createRecord("operator-1", {
      bookingId: "booking-1",
      grossWeightKg: grossWeight,
      tareWeightKg: tareWeight,
      moisturePercent: 11.5,
      foreignMatterPercent: 0.5,
      qualityGrade: QualityGrade.GRADE_A,
    });

    expect(record.netWeightKg).toBe(netWeight);
    expect(record.totalAmount).toBe(expectedTotal);
    expect(record.paymentStatus).toBe(PaymentStatus.PENDING_CLEARANCE);
  });

  it("enforces moisture tolerance rule", async () => {
    const mockBooking = {
      id: "booking-1",
      crop: { id: "crop-1", moistureLimitPercent: 12.0 },
      farmer: { id: "farmer-1", userId: "user-1", user: { name: "Farmer" } },
      procurementRecord: null,
    };

    const mockTx = {
      booking: { findUnique: vi.fn().mockResolvedValue(mockBooking) },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => cb(mockTx));

    // Moisture is 16.5% (> 12 + 3 = 15%) and not marked REJECTED
    await expect(
      ProcurementService.createRecord("operator-1", {
        bookingId: "booking-1",
        grossWeightKg: 5000,
        tareWeightKg: 1000,
        moisturePercent: 16.5,
        foreignMatterPercent: 0.5,
        qualityGrade: QualityGrade.GRADE_A,
      })
    ).rejects.toThrowError(AppError);
  });
});
