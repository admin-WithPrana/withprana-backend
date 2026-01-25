import "dotenv/config";
import {
  initializeDatabaseConnections,
  prisma,
  closeDatabaseConnections,
} from "../src/config/database.js";
import { InactivityService } from "../src/infrastructure/services/inactivityService.js";

const verify = async () => {
  // 1. Initialize DB Connection FIRST
  console.log("Connecting to database...");
  await initializeDatabaseConnections();

  // 2. Instantiate Service (now prisma is defined)
  const inactivityService = new InactivityService();

  try {
    // 3. Setup Test Users
    const now = new Date();

    // User 1: 6 months inactive (Should get warning)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 1); // Just over 6 months

    // User 2: 7 months inactive (Should be deactivated)
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(now.getMonth() - 7);
    sevenMonthsAgo.setDate(sevenMonthsAgo.getDate() - 1); // Just over 7 months

    console.log("Creating/Updating test users...");

    // Create/Upsert User 1
    const user1 = await prisma.user.upsert({
      where: { email: "warn_me@example.com" },
      update: { active: true, systemDeactivated: false },
      create: {
        email: "warn_me@example.com",
        name: "Warn Me",
        password: "pass",
        signupMethod: "email",
        active: true,
      },
    });

    await prisma.userLoginLog.upsert({
      where: { userId: user1.id },
      update: { lastLogin: sixMonthsAgo, warningSent: false },
      create: { userId: user1.id, lastLogin: sixMonthsAgo, warningSent: false },
    });

    // Create/Upsert User 2
    const user2 = await prisma.user.upsert({
      where: { email: "deactivate_me@example.com" },
      update: { active: true, systemDeactivated: false },
      create: {
        email: "deactivate_me@example.com",
        name: "Deactivate Me",
        password: "pass",
        signupMethod: "email",
        active: true,
      },
    });

    await prisma.userLoginLog.upsert({
      where: { userId: user2.id },
      update: { lastLogin: sevenMonthsAgo, warningSent: false }, // Reset for test
      create: {
        userId: user2.id,
        lastLogin: sevenMonthsAgo,
        warningSent: false,
      },
    });

    // 4. Run Inactivity Check
    console.log("🚀 Running Inactivity Check...");
    await inactivityService.checkInactivity();

    // 5. Verify Results
    const updatedUser1Log = await prisma.userLoginLog.findUnique({
      where: { userId: user1.id },
    });
    const updatedUser2 = await prisma.user.findUnique({
      where: { id: user2.id },
    });

    console.log("------------------------------------------------");
    console.log("Verification Results:");

    if (updatedUser1Log.warningSent) {
      console.log("✅ User 1 (6 months): Warning flag set to TRUE.");
    } else {
      console.error("❌ User 1: Warning flag NOT set.");
    }

    if (!updatedUser2.active && updatedUser2.systemDeactivated) {
      console.log(
        "✅ User 2 (7 months): Deactivated (active=false, systemDeactivated=true).",
      );
    } else {
      console.error(
        `❌ User 2: Failed to deactivate. Active: ${updatedUser2.active}, SysDeactivated: ${updatedUser2.systemDeactivated}`,
      );
    }
    console.log("------------------------------------------------");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await closeDatabaseConnections();
  }
};

verify();
