import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { GenerateSlotsInput, QuerySlotsInput } from "./slot.schema";
import { SlotStatus } from "@prisma/client";

export class SlotService {
  static async getSlots(input: QuerySlotsInput) {
    let slots = await db.slot.findMany({
      where: {
        centerId: input.centerId,
        date: input.date,
      },
      orderBy: { startTime: "asc" },
    });

    // If no slots exist for the requested date, auto-generate them based on the center's operating profile
    if (slots.length === 0) {
      await this.generateSlotsForCenter({
        centerId: input.centerId,
        date: input.date,
      });

      slots = await db.slot.findMany({
        where: {
          centerId: input.centerId,
          date: input.date,
        },
        orderBy: { startTime: "asc" },
      });
    }

    return slots.map((s) => ({
      id: s.id,
      centerId: s.centerId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      availableCapacity: Math.max(0, s.capacity - s.bookedCount),
      status: s.bookedCount >= s.capacity ? SlotStatus.FULL : s.status,
    }));
  }

  static async generateSlotsForCenter(input: GenerateSlotsInput) {
    const center = await db.procurementCenter.findUnique({
      where: { id: input.centerId },
    });

    if (!center) {
      throw AppError.notFound("Procurement center not found");
    }

    if (!center.isActive) {
      throw AppError.badRequest("Procurement center is inactive");
    }

    const [startH, startM] = center.operatingStartTime.split(":").map(Number);
    const [endH, endM] = center.operatingEndTime.split(":").map(Number);
    const duration = center.slotDurationMinutes || 60;
    const capacity = input.slotCapacity ?? center.defaultSlotCapacity ?? 10;

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const slotWindows: { startTime: string; endTime: string }[] = [];

    while (currentMinutes + duration <= endMinutes) {
      const sH = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
      const sM = (currentMinutes % 60).toString().padStart(2, "0");
      const nextMinutes = currentMinutes + duration;
      const eH = Math.floor(nextMinutes / 60).toString().padStart(2, "0");
      const eM = (nextMinutes % 60).toString().padStart(2, "0");

      slotWindows.push({
        startTime: `${sH}:${sM}`,
        endTime: `${eH}:${eM}`,
      });

      currentMinutes = nextMinutes;
    }

    const createdSlots = [];
    for (const win of slotWindows) {
      const slot = await db.slot.upsert({
        where: {
          centerId_date_startTime: {
            centerId: input.centerId,
            date: input.date,
            startTime: win.startTime,
          },
        },
        create: {
          centerId: input.centerId,
          date: input.date,
          startTime: win.startTime,
          endTime: win.endTime,
          capacity,
          bookedCount: 0,
          status: SlotStatus.OPEN,
        },
        update: {},
      });
      createdSlots.push(slot);
    }

    return createdSlots;
  }
}
