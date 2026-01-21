import { PrismaClient } from "@prisma/client";
import { UserController } from "../src/interfaces/controllers/userController.js";
import { UserUseCases } from "../src/domain/usecases/userUseCases.js";
import { PrismaUserRepository } from "../src/infrastructure/databases/postgres/userRepository.js";

const prisma = new PrismaClient();

// Mock Request/Reply
const mockReply = () => {
  const res = {};
  res.code = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const verifySecurity = async () => {
  console.log("🔒 Starting Security Verification...");

  try {
    const userRepo = new PrismaUserRepository(prisma);
    const userController = new UserController(userRepo, null, null);

    // 1. Create 2 Test Users
    console.log("Creating test users...");
    const user1 = await userRepo.createUser({
      email: "user1_sec@example.com",
      name: "User One",
      active: true,
      signupMethod: "email",
    });
    const user2 = await userRepo.createUser({
      email: "user2_sec@example.com",
      name: "User Two",
      active: true,
      signupMethod: "email",
    });

    console.log(
      `Created User 1 (ID: ${user1.id}) and User 2 (ID: ${user2.id})`,
    );

    // TEST 1: User 1 updates User 1 (Should Succeed)
    console.log("\nTEST 1: Owner Update");
    const req1 = {
      params: { id: String(user1.id) },
      body: { name: "User One Updated" },
      user: { id: user1.id }, // Authenticated as User 1
    };
    const res1 = mockReply();
    await userController.updateUser(req1, res1);

    if (res1.statusCode === 200 && res1.body.success) {
      console.log("✅ Owner update allowed.");
    } else {
      console.error("❌ Owner update FAILED:", res1.body);
    }

    // TEST 2: User 1 updates User 2 (Should Fail)
    console.log("\nTEST 2: Unauthorized Update");
    const req2 = {
      params: { id: String(user2.id) },
      body: { name: "User Two Hacked" },
      user: { id: user1.id }, // Authenticated as User 1
    };
    const res2 = mockReply();
    await userController.updateUser(req2, res2);

    if (res2.statusCode === 403) {
      console.log("✅ Unauthorized update blocked (403).");
    } else {
      console.error(
        "❌ Unauthorized update NOT blocked:",
        res2.statusCode,
        res2.body,
      );
    }

    // TEST 3: User 1 views User 2 (Should be filtered)
    console.log("\nTEST 3: Privacy Filter");
    const req3 = {
      params: { id: String(user2.id) },
      user: { id: user1.id },
    };
    const res3 = mockReply();
    await userController.getUserById(req3, res3);

    const data = res3.body.user;
    if (data.email) {
      console.error("❌ Privacy LEAK: Email exposed:", data.email);
    } else if (data.name === "User Two" && !data.subscriptionType) {
      console.log("✅ Privacy filter working (Name only, no Email/Sub).");
    } else {
      console.warn("⚠️ Unexpected response structure:", data);
    }

    // Cleanup
    await prisma.user.deleteMany({
      where: {
        email: { in: ["user1_sec@example.com", "user2_sec@example.com"] },
      },
    });
    console.log("\n✅ Security Verification Complete.");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await prisma.$disconnect();
  }
};

verifySecurity();
