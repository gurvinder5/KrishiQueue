import { NextRequest } from "next/server";
import { SlotService } from "@/modules/slots/slot.service";
import { querySlotsSchema, generateSlotsSchema } from "@/modules/slots/slot.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get("centerId") || "";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const validated = querySlotsSchema.parse({ centerId, date });
    const slots = await SlotService.getSlots(validated);
    return jsonSuccess(slots);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.ADMIN, Role.CENTER_OPERATOR]);
    const json = await req.json();
    const validated = generateSlotsSchema.parse(json);
    const slots = await SlotService.generateSlotsForCenter(validated);
    return jsonSuccess(slots, 201);
  } catch (error) {
    return jsonError(error);
  }
}
