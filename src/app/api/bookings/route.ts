import { NextRequest } from "next/server";
import { BookingService } from "@/modules/bookings/booking.service";
import { createBookingSchema, queryBookingsSchema } from "@/modules/bookings/booking.schema";
import { getAuthContext } from "@/server/context";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const { searchParams } = new URL(req.url);

    const queryInput: any = {
      date: searchParams.get("date") || undefined,
      centerId: searchParams.get("centerId") || undefined,
      status: searchParams.get("status") as any,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    // Farmers only see their own bookings
    if (ctx.user.role === Role.FARMER) {
      if (!ctx.user.farmerProfileId) {
        throw AppError.badRequest("Farmer profile incomplete");
      }
      queryInput.farmerId = ctx.user.farmerProfileId;
    }

    const validated = queryBookingsSchema.parse(queryInput);
    const result = await BookingService.listBookings(validated);
    return jsonSuccess(result.items, 200, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const json = await req.json();
    const validated = createBookingSchema.parse(json);

    let farmerProfileId: string;

    if (ctx.user.role === Role.FARMER) {
      if (!ctx.user.farmerProfileId) {
        throw AppError.badRequest("Farmer profile not configured for this user");
      }
      farmerProfileId = ctx.user.farmerProfileId;
    } else {
      // Operator / Admin booking on behalf of farmer
      if (!validated.farmerProfileId) {
        throw AppError.badRequest("farmerProfileId is required when booking as an operator or admin");
      }
      farmerProfileId = validated.farmerProfileId;
    }

    const booking = await BookingService.createBooking(farmerProfileId, validated);
    return jsonSuccess(booking, 201);
  } catch (error) {
    return jsonError(error);
  }
}
