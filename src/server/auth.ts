import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./env";
import { AppError } from "./errors";

export interface TokenPayload {
  userId: string;
  phone: string;
  role: Role;
  farmerProfileId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    throw AppError.unauthorized("Invalid or expired authentication token");
  }
}

export function requireRoles(userRole: Role, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(userRole)) {
    throw AppError.forbidden(`Role '${userRole}' is not authorized for this operation`);
  }
}
