import { NextRequest } from "next/server";
import { BookingService } from "@/modules/bookings/booking.service";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getAuthContext(req);
    const booking = await BookingService.getBookingById(params.id);

    if (ctx.user.role === Role.FARMER && booking.farmerId !== ctx.user.farmerProfileId) {
      throw AppError.forbidden("You do not have access to view this booking");
    }

    return jsonSuccess(booking);
  } catch (error) {
    return jsonError(error);
  }
}
