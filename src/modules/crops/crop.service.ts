import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { CreateCropInput, UpdateCropInput } from "./crop.schema";

export class CropService {
  static async listCrops(onlyActive: boolean = true) {
    return db.crop.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: "asc" },
    });
  }

  static async getCropById(id: string) {
    const crop = await db.crop.findUnique({
      where: { id },
    });
    if (!crop) {
      throw AppError.notFound("Crop not found");
    }
    return crop;
  }

  static async createCrop(input: CreateCropInput) {
    const existing = await db.crop.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw AppError.conflict("Crop code already exists", "CONFLICT");
    }
    return db.crop.create({ data: input });
  }

  static async updateCrop(id: string, input: UpdateCropInput) {
    return db.crop.update({
      where: { id },
      data: input,
    });
  }
}
