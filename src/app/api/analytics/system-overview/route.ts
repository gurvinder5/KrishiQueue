import { NextRequest } from "next/server";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.ADMIN]);
    const overview = await AnalyticsService.getSystemOverview();
    return jsonSuccess(overview);
  } catch (error) {
    return jsonError(error);
  }
}
