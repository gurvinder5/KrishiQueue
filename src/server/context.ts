import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { verifyToken, TokenPayload } from "./auth";
import { AppError } from "./errors";
import { db } from "./db";

export interface RequestContext {
  user: {
    id: string;
    phone: string;
    role: Role;
    farmerProfileId?: string;
  };
}

export async function getAuthContext(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<RequestContext> {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    // Check cookie
    const cookieToken = req.cookies.get("krishi_session")?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    throw AppError.unauthorized("Authentication token missing");
  }

  const payload: TokenPayload = verifyToken(token);

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(payload.role)) {
      throw AppError.forbidden(`Role '${payload.role}' does not have permission`);
    }
  }

  return {
    user: {
      id: payload.userId,
      phone: payload.phone,
      role: payload.role,
      farmerProfileId: payload.farmerProfileId,
    },
  };
}
