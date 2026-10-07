import { NextRequest } from "next/server";
import { ProcurementService } from "@/modules/procurement/procurement.service";
import { createProcurementRecordSchema, queryProcurementRecordsSchema } from "@/modules/procurement/procurement.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const { searchParams } = new URL(req.url);

    const queryInput: any = {
      centerId: searchParams.get("centerId") || undefined,
      cropId: searchParams.get("cropId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    if (ctx.user.role === Role.FARMER) {
      queryInput.farmerId = ctx.user.farmerProfileId;
    }

    const validated = queryProcurementRecordsSchema.parse(queryInput);
    const result = await ProcurementService.listRecords(validated);
    return jsonSuccess(result.items, 200, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req, [Role.CENTER_OPERATOR, Role.ADMIN]);
    const json = await req.json();
    const validated = createProcurementRecordSchema.parse(json);
    const record = await ProcurementService.createRecord(ctx.user.id, validated);
    return jsonSuccess(record, 201);
  } catch (error) {
    return jsonError(error);
  }
}
