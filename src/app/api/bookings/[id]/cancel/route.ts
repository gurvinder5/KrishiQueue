import { NextRequest } from "next/server";
import { BookingService } from "@/modules/bookings/booking.service";
import { cancelBookingSchema } from "@/modules/bookings/booking.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getAuthContext(req);
    const json = await req.json().catch(() => ({ reason: "Cancelled by user" }));
    const validated = cancelBookingSchema.parse(json);

    const farmerProfileId = ctx.user.role === Role.FARMER ? ctx.user.farmerProfileId : undefined;
    const cancelled = await BookingService.cancelBooking(params.id, farmerProfileId, validated.reason);

    return jsonSuccess(cancelled);
  } catch (error) {
    return jsonError(error);
  }
}
