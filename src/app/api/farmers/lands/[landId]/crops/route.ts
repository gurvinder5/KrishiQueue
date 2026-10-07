import { NextRequest } from "next/server";
import { FarmerService } from "@/modules/farmers/farmer.service";
import { addLandCropSchema } from "@/modules/farmers/farmer.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function POST(req: NextRequest, { params }: { params: { landId: string } }) {
  try {
    const ctx = await getAuthContext(req, [Role.FARMER]);
    if (!ctx.user.farmerProfileId) {
      throw AppError.badRequest("Farmer profile ID missing");
    }
    const json = await req.json();
    const validated = addLandCropSchema.parse(json);
    const crop = await FarmerService.addLandCrop(ctx.user.farmerProfileId, params.landId, validated);
    return jsonSuccess(crop, 201);
  } catch (error) {
    return jsonError(error);
  }
}
