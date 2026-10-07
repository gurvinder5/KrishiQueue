import { NextRequest } from "next/server";
import { CenterService } from "@/modules/centers/center.service";
import { createCenterSchema, centerFilterSchema } from "@/modules/centers/center.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterInput = {
      state: searchParams.get("state") || undefined,
      district: searchParams.get("district") || undefined,
      cropId: searchParams.get("cropId") || undefined,
      search: searchParams.get("search") || undefined,
      isActive: searchParams.get("isActive") as any,
    };
    const validated = centerFilterSchema.parse(filterInput);
    const centers = await CenterService.listCenters(validated);
    return jsonSuccess(centers);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.ADMIN]);
    const json = await req.json();
    const validated = createCenterSchema.parse(json);
    const center = await CenterService.createCenter(validated);
    return jsonSuccess(center, 201);
  } catch (error) {
    return jsonError(error);
  }
}
