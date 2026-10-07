import { NextRequest } from "next/server";
import { loginSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validated = loginSchema.parse(json);
    const result = await AuthService.login(validated);
    return jsonSuccess(result, 200);
  } catch (error) {
    return jsonError(error);
  }
}
