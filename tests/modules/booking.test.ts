import { describe, it, expect, vi } from "vitest";
import { BookingService } from "@/modules/bookings/booking.service";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { BookingStatus } from "@prisma/client";

describe("Booking Domain Service Suite", () => {
  it("rejects booking when crop is not active", async () => {
    vi.spyOn(db.farmerProfile, "findUnique").mockResolvedValue({
      id: "farmer-1",
      userId: "user-1",
      user: { name: "Farmer", phone: "9876543210" },
    } as any);

    vi.spyOn(db.crop, "findUnique").mockResolvedValue({
      id: "crop-1",
      isActive: false,
    } as any);

    await expect(
      BookingService.createBooking("farmer-1", {
        slotId: "slot-1",
        cropId: "crop-1",
        estimatedQuantityQuintals: 20,
        vehicleType: "TRACTOR_TROLLEY" as any,
        vehicleNumber: "PB-10-1234",
      })
    ).rejects.toThrowError(AppError);
  });

  it("handles booking cancellation and releases slot capacity", async () => {
    const mockTx = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: "booking-1",
          farmerId: "farmer-1",
          slotId: "slot-1",
          status: BookingStatus.CONFIRMED,
          bookingReference: "BK-20261015-001",
          farmer: { userId: "user-1" },
        }),
        update: vi.fn().mockResolvedValue({
          id: "booking-1",
          status: BookingStatus.CANCELLED,
        }),
      },
      slot: {
        update: vi.fn().mockResolvedValue({ id: "slot-1", bookedCount: 0 }),
      },
      queueToken: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => cb(mockTx));

    const result = await BookingService.cancelBooking("booking-1", "farmer-1", "Change of plans");
    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(mockTx.slot.update).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: {
        bookedCount: { decrement: 1 },
        status: "OPEN",
      },
    });
  });
});
