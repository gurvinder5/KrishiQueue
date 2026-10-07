import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { UpdateFarmerProfileInput, AddLandInput, AddLandCropInput } from "./farmer.schema";

export class FarmerService {
  static async getProfileByUserId(userId: string) {
    const profile = await db.farmerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        lands: {
          include: {
            landCrops: {
              include: { crop: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw AppError.notFound("Farmer profile not found for this user");
    }

    return profile;
  }

  static async updateProfile(farmerProfileId: string, input: UpdateFarmerProfileInput) {
    return db.farmerProfile.update({
      where: { id: farmerProfileId },
      data: input,
    });
  }

  static async addLand(farmerProfileId: string, input: AddLandInput) {
    return db.farmerLand.create({
      data: {
        farmerId: farmerProfileId,
        surveyNumber: input.surveyNumber,
        areaAcres: input.areaAcres,
        state: input.state,
        district: input.district,
        village: input.village,
      },
    });
  }

  static async addLandCrop(farmerProfileId: string, landId: string, input: AddLandCropInput) {
    // Verify land ownership
    const land = await db.farmerLand.findFirst({
      where: { id: landId, farmerId: farmerProfileId },
    });

    if (!land) {
      throw AppError.notFound("Land parcel not found for this farmer");
    }

    // Verify crop exists
    const crop = await db.crop.findUnique({
      where: { id: input.cropId },
    });

    if (!crop || !crop.isActive) {
      throw AppError.badRequest("Selected crop is not currently available for declaration");
    }

    return db.farmerLandCrop.create({
      data: {
        landId,
        cropId: input.cropId,
        season: input.season,
        sownAreaAcres: input.sownAreaAcres,
        estimatedYieldQuintals: input.estimatedYieldQuintals,
      },
      include: { crop: true },
    });
  }
}
