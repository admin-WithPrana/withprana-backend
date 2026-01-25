import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../src/infrastructure/databases/postgres/userRepository.js";

const verify = async () => {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to database...");
    await prisma.$connect();

    // 1. Get a user
    let user = await prisma.user.findFirst();
    if (!user) {
      console.log("⚠️ No user found. Creating a test user...");
      user = await prisma.user.create({
        data: {
          email: `test_${Date.now()}@example.com`,
          name: "Test User",
          password: "password123",
          signupMethod: "email",
        },
      });
      console.log(`✅ Created test user: ${user.email}`);
    }

    console.log(`Testing with User ID: ${user.id}`);
    const userId = Number(user.id);

    // 2. Update Last Login (simulating logic in UserUseCases)
    const userRepo = new PrismaUserRepository(prisma);
    console.log("Updating last login...");
    await userRepo.updateLastLogin(userId);

    // 3. Verify in DB
    const log = await prisma.userLoginLog.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (log) {
      console.log("✅ UserLoginLog found:");
      console.log(
        JSON.stringify({ ...log, userId: log.userId.toString() }, null, 2),
      );

      const timeDiff = Math.abs(
        new Date().getTime() - new Date(log.lastLogin).getTime(),
      );
      if (timeDiff < 5000) {
        console.log("✅ Timestamp is recent (within 5s).");
      } else {
        console.log("⚠️ Timestamp is older than 5s? Diff:", timeDiff);
      }
    } else {
      console.error("❌ UserLoginLog NOT found.");
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await prisma.$disconnect();
  }
};

verify();
