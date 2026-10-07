import { NextRequest } from "next/server";
import { ProcurementService } from "@/modules/procurement/procurement.service";
import { updatePaymentStatusSchema } from "@/modules/procurement/procurement.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getAuthContext(req);
    const record = await ProcurementService.getRecordById(params.id);

    if (ctx.user.role === Role.FARMER && record.farmerId !== ctx.user.farmerProfileId) {
      throw AppError.forbidden("You do not have access to this procurement receipt");
    }

    return jsonSuccess(record);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await getAuthContext(req, [Role.ADMIN]);
    const json = await req.json();
    const validated = updatePaymentStatusSchema.parse(json);
    const updated = await ProcurementService.updatePaymentStatus(params.id, validated);
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
