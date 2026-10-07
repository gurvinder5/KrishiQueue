import { describe, it, expect, vi } from "vitest";
import { BookingService } from "@/modules/bookings/booking.service";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";

describe("Concurrency-Safe Slot Booking Engine (Mandatory Race Condition Test)", () => {
  it("guarantees zero overbooking when concurrent requests exceed slot capacity", async () => {
    // Setup Mock Test State
    const slotCapacity = 5;
    const concurrentRequests = 20;
    let currentBookedCount = 0;
    const issuedTokens: number[] = [];
    const successfulBookings: any[] = [];
    const failedBookings: any[] = [];

    // Simulate PostgreSQL Row-Level Lock Queue (FIFO Mutex)
    let transactionLock = Promise.resolve();

    const mockTx = {
      $queryRaw: vi.fn().mockImplementation(async () => {
        return [
          {
            id: "slot-uuid-1",
            centerId: "center-uuid-1",
            date: "2026-10-15",
            startTime: "09:00",
            endTime: "10:00",
            capacity: slotCapacity,
            bookedCount: currentBookedCount,
            status: currentBookedCount >= slotCapacity ? "FULL" : "OPEN",
          },
        ];
      }),
      centerCrop: {
        findUnique: vi.fn().mockResolvedValue({ centerId: "center-uuid-1", cropId: "crop-uuid-1", isActive: true }),
      },
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => {
          return { id: `booking-${Math.random()}`, ...data };
        }),
      },
      slot: {
        update: vi.fn().mockImplementation(async ({ data }) => {
          currentBookedCount = data.bookedCount;
          return { id: "slot-uuid-1", bookedCount: currentBookedCount };
        }),
      },
      queueToken: {
        aggregate: vi.fn().mockImplementation(async () => {
          const maxNum = issuedTokens.length > 0 ? Math.max(...issuedTokens) : 0;
          return { _max: { tokenNumber: maxNum } };
        }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          issuedTokens.push(data.tokenNumber);
          return { id: `token-${data.tokenNumber}`, ...data };
        }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      },
    };

    // Serialize transaction execution as PostgreSQL does with row lock
    vi.spyOn(db, "$transaction").mockImplementation(async (callback: any) => {
      const currentLock = transactionLock;
      let releaseLock: () => void;
      transactionLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      await currentLock;
      try {
        return await callback(mockTx);
      } finally {
        releaseLock!();
      }
    });

    vi.spyOn(db.farmerProfile, "findUnique").mockResolvedValue({
      id: "farmer-uuid-1",
      userId: "user-uuid-1",
      user: { name: "Harbhajan Singh", phone: "9876543210" },
    } as any);

    vi.spyOn(db.crop, "findUnique").mockResolvedValue({
      id: "crop-uuid-1",
      name: "Wheat (Sharbati)",
      isActive: true,
      mspRatePerQuintal: 2275.0,
      moistureLimitPercent: 12.0,
    } as any);

    // Simulate 20 concurrent booking attempts hitting the backend simultaneously
    const attempts = Array.from({ length: concurrentRequests }, (_, i) =>
      BookingService.createBooking(`farmer-uuid-${i + 1}`, {
        slotId: "slot-uuid-1",
        cropId: "crop-uuid-1",
        estimatedQuantityQuintals: 40,
        vehicleType: "TRACTOR_TROLLEY" as any,
        vehicleNumber: `PB-10-AB-${1000 + i}`,
      })
        .then((res) => successfulBookings.push(res))
        .catch((err) => failedBookings.push(err))
    );

    await Promise.all(attempts);

    // Assertions
    expect(successfulBookings.length).toBe(slotCapacity); // Exactly 5 succeed
    expect(failedBookings.length).toBe(concurrentRequests - slotCapacity); // Exactly 15 fail
    expect(currentBookedCount).toBe(slotCapacity);

    // All failed bookings must receive the expected capacity exceeded code
    failedBookings.forEach((err) => {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe("SLOT_CAPACITY_EXCEEDED");
    });

    // Ensure queue tokens were sequential with no duplicates
    expect(issuedTokens).toEqual([1, 2, 3, 4, 5]);
    const uniqueTokens = new Set(issuedTokens);
    expect(uniqueTokens.size).toBe(slotCapacity);
  });
});
