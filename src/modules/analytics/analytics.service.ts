import { db } from "@/server/db";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export class AnalyticsService {
  static async getCenterDailySummary(centerId: string, date?: string) {
    const today = date || new Date().toISOString().split("T")[0];

    const [
      totalBookings,
      confirmedBookings,
      checkedInBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      procurementRecords,
      slots,
    ] = await Promise.all([
      db.booking.count({ where: { centerId, slot: { date: today } } }),
      db.booking.count({ where: { centerId, slot: { date: today }, status: BookingStatus.CONFIRMED } }),
      db.booking.count({ where: { centerId, slot: { date: today }, status: BookingStatus.CHECKED_IN } }),
      db.booking.count({ where: { centerId, slot: { date: today }, status: BookingStatus.COMPLETED } }),
      db.booking.count({ where: { centerId, slot: { date: today }, status: BookingStatus.CANCELLED } }),
      db.booking.count({ where: { centerId, slot: { date: today }, status: BookingStatus.REJECTED } }),
      db.procurementRecord.findMany({
        where: { centerId, booking: { slot: { date: today } } },
        include: { crop: true },
      }),
      db.slot.findMany({
        where: { centerId, date: today },
        orderBy: { startTime: "asc" },
      }),
    ]);

    let totalWeightKg = 0;
    let totalDisbursed = 0;
    const cropBreakdown: Record<string, { name: string; weightKg: number; amount: number; count: number }> = {};

    for (const record of procurementRecords) {
      const netKg = Number(record.netWeightKg);
      const amount = Number(record.totalAmount);
      totalWeightKg += netKg;
      totalDisbursed += amount;

      if (!cropBreakdown[record.cropId]) {
        cropBreakdown[record.cropId] = {
          name: record.crop.name,
          weightKg: 0,
          amount: 0,
          count: 0,
        };
      }
      cropBreakdown[record.cropId].weightKg += netKg;
      cropBreakdown[record.cropId].amount += amount;
      cropBreakdown[record.cropId].count += 1;
    }

    // Find slot with highest booking count
    let peakSlot = "N/A";
    let maxBooked = -1;
    for (const s of slots) {
      if (s.bookedCount > maxBooked) {
        maxBooked = s.bookedCount;
        peakSlot = `${s.startTime} - ${s.endTime}`;
      }
    }

    return {
      centerId,
      date: today,
      metrics: {
        totalBookings,
        confirmedBookings,
        checkedInBookings,
        completedBookings,
        cancelledBookings,
        rejectedBookings,
        totalProcuredQuintals: totalWeightKg / 100,
        totalDisbursedAmountINR: totalDisbursed,
        peakHourSlot: peakSlot,
      },
      cropBreakdown: Object.values(cropBreakdown),
      slotsTimeline: slots.map((s) => ({
        time: `${s.startTime}-${s.endTime}`,
        capacity: s.capacity,
        booked: s.bookedCount,
        available: Math.max(0, s.capacity - s.bookedCount),
      })),
    };
  }

  static async getSystemOverview() {
    const [
      totalCenters,
      totalFarmers,
      totalBookings,
      totalProcuredRecords,
    ] = await Promise.all([
      db.procurementCenter.count({ where: { isActive: true } }),
      db.farmerProfile.count(),
      db.booking.count(),
      db.procurementRecord.aggregate({
        _sum: {
          netWeightKg: true,
          totalAmount: true,
        },
      }),
    ]);

    return {
      totalActiveCenters: totalCenters,
      totalRegisteredFarmers: totalFarmers,
      totalBookingsProcessed: totalBookings,
      totalProcuredQuintals: (Number(totalProcuredRecords._sum.netWeightKg) || 0) / 100,
      totalDisbursedINR: Number(totalProcuredRecords._sum.totalAmount) || 0,
    };
  }
}
