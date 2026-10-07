import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { CreateCenterInput, UpdateCenterInput, CenterFilterInput } from "./center.schema";
import { SlotService } from "../slots/slot.service";

export class CenterService {
  static async listCenters(filters?: CenterFilterInput) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === "true";
    } else {
      where.isActive = true;
    }

    if (filters?.state) {
      where.state = { contains: filters.state, mode: "insensitive" };
    }

    if (filters?.district) {
      where.district = { contains: filters.district, mode: "insensitive" };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { village: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.cropId) {
      where.acceptedCrops = {
        some: { cropId: filters.cropId, isActive: true },
      };
    }

    return db.procurementCenter.findMany({
      where,
      include: {
        acceptedCrops: {
          include: { crop: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  static async getCenterById(id: string) {
    const center = await db.procurementCenter.findUnique({
      where: { id },
      include: {
        acceptedCrops: {
          include: { crop: true },
        },
        operators: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
      },
    });

    if (!center) {
      throw AppError.notFound("Procurement center not found");
    }

    return center;
  }

  static async createCenter(input: CreateCenterInput) {
    const existing = await db.procurementCenter.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw AppError.conflict("Center code already exists", "CONFLICT");
    }

    const { cropIds, ...centerData } = input;

    const center = await db.procurementCenter.create({
      data: {
        ...centerData,
        acceptedCrops: cropIds
          ? {
              create: cropIds.map((cropId) => ({ cropId, isActive: true })),
            }
          : undefined,
      },
      include: {
        acceptedCrops: { include: { crop: true } },
      },
    });

    return center;
  }

  static async updateCenter(id: string, input: UpdateCenterInput) {
    const { cropIds, ...centerData } = input;

    return db.$transaction(async (tx) => {
      const updated = await tx.procurementCenter.update({
        where: { id },
        data: centerData,
      });

      if (cropIds) {
        // Replace crops
        await tx.centerCrop.deleteMany({ where: { centerId: id } });
        await tx.centerCrop.createMany({
          data: cropIds.map((cropId) => ({ centerId: id, cropId, isActive: true })),
        });
      }

      return tx.procurementCenter.findUnique({
        where: { id },
        include: { acceptedCrops: { include: { crop: true } } },
      });
    });
  }

  static async assignOperator(centerId: string, userId: string) {
    const center = await db.procurementCenter.findUnique({ where: { id: centerId } });
    if (!center) throw AppError.notFound("Center not found");

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    return db.centerOperator.upsert({
      where: { userId_centerId: { userId, centerId } },
      create: { userId, centerId },
      update: {},
    });
  }
}
