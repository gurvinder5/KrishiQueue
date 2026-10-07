import { NextRequest } from "next/server";
import { QueueService } from "@/modules/queue/queue.service";
import { callNextTokenSchema } from "@/modules/queue/queue.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.CENTER_OPERATOR, Role.ADMIN]);
    const json = await req.json();
    const validated = callNextTokenSchema.parse(json);
    const result = await QueueService.callNextToken(validated);
    return jsonSuccess(result, 200);
  } catch (error) {
    return jsonError(error);
  }
}
