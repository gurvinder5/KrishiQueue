import { PrismaClient, Role, UserStatus, CropCategory, QualityGrade, VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting KrishiQueue database seed...");

  // 1. Clean existing test data if resetting
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.procurementRecord.deleteMany();
  await prisma.queueToken.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.centerCrop.deleteMany();
  await prisma.centerOperator.deleteMany();
  await prisma.farmerLandCrop.deleteMany();
  await prisma.farmerLand.deleteMany();
  await prisma.farmerProfile.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.procurementCenter.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default password
  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash("Krishi@2026", salt);

  // 3. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      phone: "9999900000",
      email: "admin@krishiqueue.gov.in",
      name: "Dr. Arvind Sharma (State Agricultural Director)",
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 4. Seed Standard Government Crops & MSPs
  const crops = await Promise.all([
    prisma.crop.create({
      data: {
        code: "WHEAT_SHARBATI",
        name: "Wheat (Sharbati / Grade A)",
        category: CropCategory.CEREALS,
        mspRatePerQuintal: 2275.0,
        procurementSeason: "RABI_2026",
        moistureLimitPercent: 12.0,
        foreignMatterLimit: 0.75,
      },
    }),
    prisma.crop.create({
      data: {
        code: "PADDY_COMMON",
        name: "Paddy (Common Grain)",
        category: CropCategory.CEREALS,
        mspRatePerQuintal: 2300.0,
        procurementSeason: "KHARIF_2026",
        moistureLimitPercent: 17.0,
        foreignMatterLimit: 1.0,
      },
    }),
    prisma.crop.create({
      data: {
        code: "MUSTARD_SEED",
        name: "Mustard Seed (Sarson)",
        category: CropCategory.OILSEEDS,
        mspRatePerQuintal: 5650.0,
        procurementSeason: "RABI_2026",
        moistureLimitPercent: 8.0,
        foreignMatterLimit: 1.0,
      },
    }),
    prisma.crop.create({
      data: {
        code: "GRAM_CHANA",
        name: "Gram (Chana / Chickpea)",
        category: CropCategory.PULSES,
        mspRatePerQuintal: 5440.0,
        procurementSeason: "RABI_2026",
        moistureLimitPercent: 10.0,
        foreignMatterLimit: 1.0,
      },
    }),
  ]);

  // 5. Seed Procurement Centers
  const center1 = await prisma.procurementCenter.create({
    data: {
      code: "PB-LUD-KHN-01",
      name: "Khanna APMC Main Mandi Hub",
      address: "GT Road, Near Railway Siding",
      village: "Khanna",
      taluk: "Khanna",
      district: "Ludhiana",
      state: "Punjab",
      pincode: "141401",
      latitude: 30.7046,
      longitude: 76.2163,
      dailyCapacityQuintals: 10000,
      maxVehiclesPerHour: 20,
      operatingStartTime: "08:00",
      operatingEndTime: "18:00",
      slotDurationMinutes: 60,
      defaultSlotCapacity: 8,
    },
  });

  const center2 = await prisma.procurementCenter.create({
    data: {
      code: "HR-KRN-KRN-01",
      name: "Karnal New Grain Market APMC",
      address: "Sector 3, GT Karnal Road",
      district: "Karnal",
      state: "Haryana",
      pincode: "132001",
      latitude: 29.6857,
      longitude: 76.9905,
      dailyCapacityQuintals: 8000,
      maxVehiclesPerHour: 15,
      operatingStartTime: "08:00",
      operatingEndTime: "18:00",
      slotDurationMinutes: 60,
      defaultSlotCapacity: 6,
    },
  });

  // 6. Map Crops to Centers
  for (const crop of crops) {
    await prisma.centerCrop.create({
      data: { centerId: center1.id, cropId: crop.id },
    });
    await prisma.centerCrop.create({
      data: { centerId: center2.id, cropId: crop.id },
    });
  }

  // 7. Seed Center Operators
  const opUser1 = await prisma.user.create({
    data: {
      phone: "9888800001",
      email: "operator.khanna@krishiqueue.gov.in",
      name: "Gurpreet Singh (Mandi Inspector)",
      passwordHash: defaultPassword,
      role: Role.CENTER_OPERATOR,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.centerOperator.create({
    data: {
      userId: opUser1.id,
      centerId: center1.id,
    },
  });

  // 8. Seed Farmers with FarmerProfiles and Lands
  const farmerUser1 = await prisma.user.create({
    data: {
      phone: "9876500001",
      email: "farmer.harbhajan@example.com",
      name: "Sardar Harbhajan Singh",
      passwordHash: defaultPassword,
      role: Role.FARMER,
      status: UserStatus.ACTIVE,
    },
  });

  const farmerProfile1 = await prisma.farmerProfile.create({
    data: {
      userId: farmerUser1.id,
      farmerIdNumber: "PMK-PB-2024-88912",
      state: "Punjab",
      district: "Ludhiana",
      village: "Rahon Road",
      pincode: "141401",
      bankAccountNo: "50100234567890",
      bankIfsc: "PUNB0123400",
      bankName: "Punjab National Bank",
    },
  });

  const land1 = await prisma.farmerLand.create({
    data: {
      farmerId: farmerProfile1.id,
      surveyNumber: "KH-402/12",
      areaAcres: 12.5,
      state: "Punjab",
      district: "Ludhiana",
      village: "Rahon Road",
    },
  });

  await prisma.farmerLandCrop.create({
    data: {
      landId: land1.id,
      cropId: crops[0].id,
      season: "RABI_2026",
      sownAreaAcres: 10.0,
      estimatedYieldQuintals: 200.0,
    },
  });

  // 9. Generate Daily Time Slots for Center 1
  const todayStr = new Date().toISOString().split("T")[0];
  const slotHours = [
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];

  for (const sh of slotHours) {
    await prisma.slot.create({
      data: {
        centerId: center1.id,
        date: todayStr,
        startTime: sh.start,
        endTime: sh.end,
        capacity: 5,
        bookedCount: 0,
      },
    });
  }

  console.log("✅ KrishiQueue database seed completed successfully!");
  console.log("   Admin:", admin.phone);
  console.log("   Operator:", opUser1.phone);
  console.log("   Farmer:", farmerUser1.phone);
  console.log("   Default password: Krishi@2026");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
