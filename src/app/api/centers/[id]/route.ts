import { NextRequest } from "next/server";
import { CenterService } from "@/modules/centers/center.service";
import { updateCenterSchema } from "@/modules/centers/center.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const center = await CenterService.getCenterById(params.id);
    return jsonSuccess(center);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await getAuthContext(req, [Role.ADMIN]);
    const json = await req.json();
    const validated = updateCenterSchema.parse(json);
    const updated = await CenterService.updateCenter(params.id, validated);
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
