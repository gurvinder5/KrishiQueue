import { NextRequest } from "next/server";
import { FarmerService } from "@/modules/farmers/farmer.service";
import { addLandSchema } from "@/modules/farmers/farmer.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req, [Role.FARMER]);
    if (!ctx.user.farmerProfileId) {
      throw AppError.badRequest("Farmer profile ID missing");
    }
    const json = await req.json();
    const validated = addLandSchema.parse(json);
    const land = await FarmerService.addLand(ctx.user.farmerProfileId, validated);
    return jsonSuccess(land, 201);
  } catch (error) {
    return jsonError(error);
  }
}
