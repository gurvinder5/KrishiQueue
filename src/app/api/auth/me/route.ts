import { NextRequest } from "next/server";
import { getAuthContext } from "@/server/context";
import { AuthService } from "@/modules/auth/auth.service";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const profile = await AuthService.getProfile(ctx.user.id);
    return jsonSuccess(profile);
  } catch (error) {
    return jsonError(error);
  }
}
