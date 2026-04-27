import {
  initializeDatabaseConnections,
  prisma,
  closeDatabaseConnections,
} from "../src/config/database.js";
import { DashboardRepository } from "../src/infrastructure/databases/postgres/dashboardRepository.js";

const verify = async () => {
  try {
    console.log("Connecting to database...");
    await initializeDatabaseConnections();
    console.log("Connected.");

    const dashboardRepo = new DashboardRepository(prisma);
    console.log("Fetching dashboard stats...");
    const stats = await dashboardRepo.getStats();

    console.log("--------------------------------");
    console.log("✅ Dashboard Stats Verification");
    console.log("--------------------------------");
    console.log(JSON.stringify(stats, null, 2));
    console.log("--------------------------------");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await closeDatabaseConnections();
  }
};

verify();
