import { NextRequest } from "next/server";
import { FarmerService } from "@/modules/farmers/farmer.service";
import { updateFarmerProfileSchema } from "@/modules/farmers/farmer.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req, [Role.FARMER]);
    const profile = await FarmerService.getProfileByUserId(ctx.user.id);
    return jsonSuccess(profile);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req, [Role.FARMER]);
    if (!ctx.user.farmerProfileId) {
      throw AppError.badRequest("Farmer profile ID missing");
    }
    const json = await req.json();
    const validated = updateFarmerProfileSchema.parse(json);
    const updated = await FarmerService.updateProfile(ctx.user.farmerProfileId, validated);
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
