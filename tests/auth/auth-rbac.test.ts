import { describe, it, expect, vi } from "vitest";
import { AuthService } from "@/modules/auth/auth.service";
import { signToken, verifyToken, requireRoles } from "@/server/auth";
import { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

describe("Authentication & RBAC Security Suite", () => {
  it("generates and verifies valid JWT tokens with role context", () => {
    const payload = {
      userId: "user-123",
      phone: "9876543210",
      role: Role.FARMER,
      farmerProfileId: "farmer-123",
    };

    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.phone).toBe(payload.phone);
    expect(decoded.role).toBe(Role.FARMER);
    expect(decoded.farmerProfileId).toBe(payload.farmerProfileId);
  });

  it("enforces role guards correctly", () => {
    expect(() => requireRoles(Role.ADMIN, [Role.ADMIN])).not.toThrow();
    expect(() => requireRoles(Role.CENTER_OPERATOR, [Role.ADMIN, Role.CENTER_OPERATOR])).not.toThrow();
    expect(() => requireRoles(Role.FARMER, [Role.ADMIN])).toThrowError(AppError);
  });

  it("rejects corrupted or expired tokens", () => {
    expect(() => verifyToken("invalid.token.payload")).toThrowError(AppError);
  });
});
