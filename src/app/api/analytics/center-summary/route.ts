import { NextRequest } from "next/server";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    await getAuthContext(req, [Role.CENTER_OPERATOR, Role.ADMIN]);
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get("centerId");
    const date = searchParams.get("date") || undefined;

    if (!centerId) {
      throw AppError.badRequest("centerId query parameter is required");
    }

    const summary = await AnalyticsService.getCenterDailySummary(centerId, date);
    return jsonSuccess(summary);
  } catch (error) {
    return jsonError(error);
  }
}
