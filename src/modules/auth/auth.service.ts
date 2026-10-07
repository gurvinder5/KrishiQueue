import { db } from "@/server/db";
import { hashPassword, verifyPassword, signToken } from "@/server/auth";
import { AppError } from "@/server/errors";
import { RegisterInput, LoginInput } from "./auth.schema";
import { Role, UserStatus } from "@prisma/client";

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phone: input.phone },
          ...(input.email ? [{ email: input.email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw AppError.conflict("A user with this phone number or email already exists", "USER_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: input.phone,
          name: input.name,
          email: input.email || null,
          passwordHash,
          role: input.role || Role.FARMER,
          status: UserStatus.ACTIVE,
        },
      });

      let farmerProfile = null;
      if (newUser.role === Role.FARMER && input.farmerDetails) {
        farmerProfile = await tx.farmerProfile.create({
          data: {
            userId: newUser.id,
            farmerIdNumber: input.farmerDetails.farmerIdNumber || `FM-${Date.now().toString().slice(-6)}`,
            state: input.farmerDetails.state,
            district: input.farmerDetails.district,
            taluk: input.farmerDetails.taluk || null,
            village: input.farmerDetails.village,
            pincode: input.farmerDetails.pincode,
            bankAccountNo: input.farmerDetails.bankAccountNo || null,
            bankIfsc: input.farmerDetails.bankIfsc || null,
            bankName: input.farmerDetails.bankName || null,
          },
        });
      }

      return { ...newUser, farmerProfile };
    });

    const token = signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      farmerProfileId: user.farmerProfile?.id,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        farmerProfile: user.farmerProfile,
      },
    };
  }

  static async login(input: LoginInput) {
    const user = await db.user.findUnique({
      where: { phone: input.phone },
      include: {
        farmerProfile: true,
        operatorAssignments: {
          include: { center: true },
        },
      },
    });

    if (!user) {
      throw AppError.badRequest("Invalid phone number or password", "INVALID_CREDENTIALS");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.forbidden("Your account is not active. Please contact the administrator.");
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.badRequest("Invalid phone number or password", "INVALID_CREDENTIALS");
    }

    const token = signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      farmerProfileId: user.farmerProfile?.id,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        farmerProfile: user.farmerProfile,
        operatorCenters: user.operatorAssignments.map((oa) => ({
          id: oa.center.id,
          code: oa.center.code,
          name: oa.center.name,
        })),
      },
    };
  }

  static async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        farmerProfile: {
          include: {
            lands: {
              include: {
                landCrops: {
                  include: { crop: true },
                },
              },
            },
          },
        },
        operatorAssignments: {
          include: { center: true },
        },
      },
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
