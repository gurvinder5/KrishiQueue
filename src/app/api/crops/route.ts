import { NextRequest } from "next/server";
import { CropService } from "@/modules/crops/crop.service";
import { createCropSchema } from "@/modules/crops/crop.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const crops = await CropService.listCrops(!all);
    return jsonSuccess(crops);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.ADMIN]);
    const json = await req.json();
    const validated = createCropSchema.parse(json);
    const crop = await CropService.createCrop(validated);
    return jsonSuccess(crop, 201);
  } catch (error) {
    return jsonError(error);
  }
}
