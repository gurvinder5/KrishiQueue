import { NextRequest } from "next/server";
import { registerSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validated = registerSchema.parse(json);
    const result = await AuthService.register(validated);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
