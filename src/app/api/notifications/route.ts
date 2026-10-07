import { NextRequest } from "next/server";
import { NotificationService } from "@/modules/notifications/notification.service";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifications = await NotificationService.getUserNotifications(ctx.user.id, unreadOnly);
    return jsonSuccess(notifications);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const result = await NotificationService.markAllAsRead(ctx.user.id);
    return jsonSuccess({ count: result.count, message: "All notifications marked as read" });
  } catch (error) {
    return jsonError(error);
  }
}
