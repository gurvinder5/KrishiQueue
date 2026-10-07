import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { CreateProcurementRecordInput, UpdatePaymentStatusInput, QueryProcurementRecordsInput } from "./procurement.schema";
import { BookingStatus, TokenStatus, QualityGrade, PaymentStatus } from "@prisma/client";

export class ProcurementService {
  static async createRecord(operatorUserId: string, input: CreateProcurementRecordInput) {
    if (input.grossWeightKg <= input.tareWeightKg) {
      throw AppError.badRequest("Gross weight must be greater than tare weight");
    }

    const netWeightKg = input.grossWeightKg - input.tareWeightKg;
    const netWeightQuintals = netWeightKg / 100;

    return db.$transaction(async (tx) => {
      // 1. Fetch booking with crop and farmer
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        include: {
          crop: true,
          farmer: { include: { user: true } },
          procurementRecord: true,
        },
      });

      if (!booking) {
        throw AppError.notFound("Booking not found");
      }

      if (booking.procurementRecord) {
        throw AppError.conflict("A procurement record has already been generated for this booking");
      }

      // 2. Validate moisture against crop limits
      const maxAllowedMoisture = Number(booking.crop.moistureLimitPercent);
      if (input.moisturePercent > maxAllowedMoisture + 3.0 && input.qualityGrade !== QualityGrade.REJECTED) {
        throw AppError.badRequest(
          `Moisture level (${input.moisturePercent}%) exceeds maximum permissible tolerance (${maxAllowedMoisture}%). Produce must be marked REJECTED.`,
          "MOISTURE_EXCEEDED"
        );
      }

      // 3. Determine final rate per quintal
      const ratePerQuintal = input.customRatePerQuintal ?? Number(booking.crop.mspRatePerQuintal);
      const isRejected = input.qualityGrade === QualityGrade.REJECTED;
      const totalAmount = isRejected ? 0 : netWeightQuintals * ratePerQuintal;

      // 4. Generate unique receipt number
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const receiptNumber = `RCP-${year}-${randomSuffix}`;

      // 5. Create procurement record
      const record = await tx.procurementRecord.create({
        data: {
          receiptNumber,
          bookingId: booking.id,
          centerId: booking.centerId,
          farmerId: booking.farmerId,
          cropId: booking.cropId,
          operatorId: operatorUserId,
          grossWeightKg: input.grossWeightKg,
          tareWeightKg: input.tareWeightKg,
          netWeightKg,
          moisturePercent: input.moisturePercent,
          foreignMatterPercent: input.foreignMatterPercent,
          qualityGrade: input.qualityGrade,
          ratePerQuintal,
          totalAmount,
          paymentStatus: isRejected ? PaymentStatus.FAILED : PaymentStatus.PENDING_CLEARANCE,
          notes: input.notes,
        },
        include: {
          crop: true,
          farmer: { include: { user: { select: { name: true, phone: true } } } },
          center: { select: { name: true, code: true } },
        },
      });

      // 6. Update booking & token status
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: isRejected ? BookingStatus.REJECTED : BookingStatus.COMPLETED },
      });

      await tx.queueToken.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: isRejected ? TokenStatus.SKIPPED : TokenStatus.COMPLETED,
          completedTime: new Date(),
        },
      });

      // 7. Dispatch notification
      const notifTitle = isRejected ? "Procurement Lot Rejected" : "Procurement Slip Generated";
      const notifMsg = isRejected
        ? `Your lot for booking ${booking.bookingReference} was rejected due to quality/moisture parameters (${input.moisturePercent}%).`
        : `Procurement receipt ${receiptNumber} generated for ${netWeightQuintals.toFixed(2)} Quintals of ${booking.crop.name}. Total payable: ₹${totalAmount.toLocaleString("en-IN")}.`;

      await tx.notification.create({
        data: {
          userId: booking.farmer.userId,
          title: notifTitle,
          message: notifMsg,
          type: isRejected ? "QUALITY_REJECTED" : "PAYMENT_DISBURSED",
        },
      });

      return record;
    });
  }

  static async getRecordById(id: string) {
    const record = await db.procurementRecord.findUnique({
      where: { id },
      include: {
        crop: true,
        farmer: { include: { user: { select: { name: true, phone: true, email: true } } } },
        center: true,
        operator: { select: { name: true, phone: true } },
        booking: true,
      },
    });

    if (!record) {
      throw AppError.notFound("Procurement record not found");
    }

    return record;
  }

  static async updatePaymentStatus(recordId: string, input: UpdatePaymentStatusInput) {
    return db.procurementRecord.update({
      where: { id: recordId },
      data: {
        paymentStatus: input.paymentStatus,
        paymentReference: input.paymentReference,
      },
    });
  }

  static async listRecords(query: QueryProcurementRecordsInput) {
    const where: any = {};
    if (query.centerId) where.centerId = query.centerId;
    if (query.farmerId) where.farmerId = query.farmerId;
    if (query.cropId) where.cropId = query.cropId;

    const skip = (query.page - 1) * query.limit;

    const [total, records] = await Promise.all([
      db.procurementRecord.count({ where }),
      db.procurementRecord.findMany({
        where,
        skip,
        take: query.limit,
        include: {
          crop: true,
          farmer: { include: { user: { select: { name: true, phone: true } } } },
          center: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items: records,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
