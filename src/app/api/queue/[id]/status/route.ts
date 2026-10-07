import { NextRequest } from "next/server";
import { QueueService } from "@/modules/queue/queue.service";
import { updateTokenStatusSchema } from "@/modules/queue/queue.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await getAuthContext(req, [Role.CENTER_OPERATOR, Role.ADMIN]);
    const json = await req.json();
    const validated = updateTokenStatusSchema.parse(json);
    const updated = await QueueService.updateTokenStatus(params.id, validated);
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
