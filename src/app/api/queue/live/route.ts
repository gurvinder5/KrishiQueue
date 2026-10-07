import { NextRequest } from "next/server";
import { QueueService } from "@/modules/queue/queue.service";
import { liveQueueQuerySchema } from "@/modules/queue/queue.schema";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get("centerId") || "";
    const date = searchParams.get("date") || undefined;

    const validated = liveQueueQuerySchema.parse({ centerId, date });
    const queue = await QueueService.getLiveQueue(validated);
    return jsonSuccess(queue);
  } catch (error) {
    return jsonError(error);
  }
}
