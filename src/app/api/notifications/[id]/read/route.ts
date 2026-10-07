import { NextRequest } from "next/server";
import { NotificationService } from "@/modules/notifications/notification.service";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getAuthContext(req);
    const updated = await NotificationService.markAsRead(params.id, ctx.user.id);
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
