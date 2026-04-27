import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../src/infrastructure/databases/postgres/userRepository.js";

const prisma = new PrismaClient();
const userRepo = new PrismaUserRepository(prisma);

async function testFindById() {
  console.log("Testing findById...");
  try {
    // 1. Create a user to ensure we have a valid ID
    const email = `test_get_${Date.now()}@test.com`;
    console.log(`Creating user with email: ${email}`);

    // Manually create via prisma to simulate how repository does it inside createUser
    // We want to test retrieval specifically.
    // Actually, let's use the repo's createUser to be realistic.

    /* Mock user object */
    const mockUser = {
      email: email,
      name: "Test Get User",
      signupMethod: "email",
      active: true,
      isVerified: true,
    };

    const created = await userRepo.createUser(mockUser);
    console.log("Created User ID:", created.id);

    // 2. Try to find the user by ID
    const found = await userRepo.findById(created.id);
    console.log("Found User:", found ? found.id : "NULL");

    if (found && found.id === created.id) {
      console.log("PASS: findById works successfully.");
    } else {
      console.log("FAIL: User not found via findById.");
    }

    // 3. Test with a SPECIFIC KNOWN ID (if provided by user previously, but we can't guarantee existence)
    // "7c7e0bd0-e020-4400-944a-b550a9dd1b9b"
    const specificId = "7c7e0bd0-e020-4400-944a-b550a9dd1b9b";
    console.log(`Testing specific ID: ${specificId}`);
    const specificFound = await userRepo.findById(specificId);
    console.log(
      "Specific User Found:",
      specificFound ? specificFound.email : "Not Found",
    );
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFindById();
