import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { CallNextTokenInput, UpdateTokenStatusInput, LiveQueueQueryInput } from "./queue.schema";
import { TokenStatus, BookingStatus } from "@prisma/client";

export class QueueService {
  static async getLiveQueue(input: LiveQueueQueryInput) {
    const today = input.date || new Date().toISOString().split("T")[0];

    const [currentlyServing, waitingTokens, completedCount, totalCount] = await Promise.all([
      db.queueToken.findMany({
        where: {
          centerId: input.centerId,
          tokenDate: today,
          status: { in: [TokenStatus.CALLED, TokenStatus.AT_GATE, TokenStatus.IN_QUALITY_CHECK, TokenStatus.AT_WEIGHBRIDGE, TokenStatus.UNLOADING] },
        },
        include: {
          booking: {
            include: {
              farmer: { include: { user: { select: { name: true, phone: true } } } },
              crop: true,
              slot: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.queueToken.findMany({
        where: {
          centerId: input.centerId,
          tokenDate: today,
          status: TokenStatus.WAITING,
        },
        include: {
          booking: {
            include: {
              farmer: { include: { user: { select: { name: true, phone: true } } } },
              crop: true,
              slot: true,
            },
          },
        },
        orderBy: { tokenNumber: "asc" },
        take: 20,
      }),
      db.queueToken.count({
        where: {
          centerId: input.centerId,
          tokenDate: today,
          status: TokenStatus.COMPLETED,
        },
      }),
      db.queueToken.count({
        where: {
          centerId: input.centerId,
          tokenDate: today,
        },
      }),
    ]);

    return {
      centerId: input.centerId,
      date: today,
      currentlyServing: currentlyServing.map((t) => ({
        tokenId: t.id,
        tokenNumber: t.tokenNumber,
        tokenDisplay: t.tokenDisplay,
        status: t.status,
        counterNumber: t.counterNumber,
        farmerName: t.booking.farmer.user.name,
        cropName: t.booking.crop.name,
        slotTime: `${t.booking.slot.startTime} - ${t.booking.slot.endTime}`,
        vehicleNumber: t.booking.vehicleNumber,
        actualCallTime: t.actualCallTime,
      })),
      nextInQueue: waitingTokens.map((t, index) => ({
        tokenId: t.id,
        tokenNumber: t.tokenNumber,
        tokenDisplay: t.tokenDisplay,
        farmerName: t.booking.farmer.user.name,
        cropName: t.booking.crop.name,
        slotTime: `${t.booking.slot.startTime} - ${t.booking.slot.endTime}`,
        estimatedWaitMinutes: (index + 1) * 12, // Approx 12 min per unloading slot
      })),
      totalWaiting: waitingTokens.length,
      totalCompletedToday: completedCount,
      totalIssuedToday: totalCount,
    };
  }

  static async callNextToken(input: CallNextTokenInput) {
    const today = input.date || new Date().toISOString().split("T")[0];

    return db.$transaction(async (tx) => {
      // Find lowest waiting token for today
      const nextToken = await tx.queueToken.findFirst({
        where: {
          centerId: input.centerId,
          tokenDate: today,
          status: TokenStatus.WAITING,
        },
        include: {
          booking: {
            include: {
              farmer: { include: { user: true } },
              crop: true,
            },
          },
        },
        orderBy: { tokenNumber: "asc" },
      });

      if (!nextToken) {
        throw AppError.notFound("No waiting tokens in queue for this center today");
      }

      // Update token to CALLED
      const updatedToken = await tx.queueToken.update({
        where: { id: nextToken.id },
        data: {
          status: TokenStatus.CALLED,
          counterNumber: input.counterNumber,
          actualCallTime: new Date(),
        },
      });

      // Update booking status
      await tx.booking.update({
        where: { id: nextToken.bookingId },
        data: { status: BookingStatus.CHECKED_IN },
      });

      // Send SMS/In-App Notification to farmer
      await tx.notification.create({
        data: {
          userId: nextToken.booking.farmer.userId,
          title: "Token Called — Proceed to Gate",
          message: `Token ${nextToken.tokenDisplay} has been called to ${input.counterNumber}. Please proceed with your vehicle (${nextToken.booking.vehicleNumber}).`,
          type: "QUEUE_CALL",
        },
      });

      return {
        token: updatedToken,
        booking: nextToken.booking,
      };
    });
  }

  static async updateTokenStatus(tokenId: string, input: UpdateTokenStatusInput) {
    const token = await db.queueToken.findUnique({
      where: { id: tokenId },
      include: { booking: { include: { farmer: true } } },
    });

    if (!token) {
      throw AppError.notFound("Queue token not found");
    }

    const data: any = {
      status: input.status,
      ...(input.counterNumber ? { counterNumber: input.counterNumber } : {}),
      ...(input.status === TokenStatus.COMPLETED ? { completedTime: new Date() } : {}),
    };

    const updated = await db.queueToken.update({
      where: { id: tokenId },
      data,
    });

    // Map token status to booking status
    let bookingStatus: BookingStatus | null = null;
    if (input.status === TokenStatus.IN_QUALITY_CHECK) bookingStatus = BookingStatus.IN_INSPECTION;
    if (input.status === TokenStatus.AT_WEIGHBRIDGE) bookingStatus = BookingStatus.WEIGHED;
    if (input.status === TokenStatus.COMPLETED) bookingStatus = BookingStatus.COMPLETED;

    if (bookingStatus) {
      await db.booking.update({
        where: { id: token.bookingId },
        data: { status: bookingStatus },
      });
    }

    return updated;
  }
}
