import "dotenv/config";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../src/interfaces/middleware/authMiddleware.js";
import {
  initializeDatabaseConnections,
  closeDatabaseConnections,
  prisma,
} from "../src/config/database.js";

async function runTest() {
  console.log("Starting Admin Middleware Verification...");

  // Initialize App DB connections so authMiddleware has access to prisma
  await initializeDatabaseConnections();

  // Setup: Create Dummy User and Admin
  const uniqueId = Date.now();
  const adminEmail = `testadmin_${uniqueId}@example.com`;
  const userEmail = `testuser_${uniqueId}@example.com`;

  let admin, user;

  try {
    // Create Admin
    admin = await prisma.admin.create({
      data: {
        id: Math.floor(Math.random() * 100000),
        email: adminEmail,
        password: "hashedpassword",
        isSuper: true,
        active: true,
      },
    });
    console.log("Created Test Admin:", admin.id);

    // Create User (DB should now have systemDeactivated column)
    user = await prisma.user.create({
      data: {
        email: userEmail,
        signupMethod: "email",
        active: true,
        isVerified: true,
      },
    });
    console.log("Created Test User:", user.id);

    // --- TEST 1: ADMIN AUTHENTICATION ---
    console.log("\nTest 1: Verifying Admin Token...");
    const adminToken = jwt.sign(
      { id: admin.id, email: admin.email, isSuper: admin.isSuper },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    let req = {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {},
    };
    let res = {
      code: function (c) {
        this.statusCode = c;
        return this;
      },
      send: function (b) {
        this.body = b;
      },
    };

    await authMiddleware(req, res);

    if (
      req.user &&
      req.user.id === admin.id &&
      req.user.isSuper !== undefined
    ) {
      console.log("PASS: Admin authenticated and attached to req.user");
    } else {
      console.error("FAIL: Admin authentication failed", req.user);
      process.exit(1);
    }

    // --- TEST 2: USER AUTHENTICATION ---
    if (user) {
      console.log("\nTest 2: Verifying User Token...");

      // Ensure ID is string for token
      const userIdStr = user.id.toString();

      const userToken = jwt.sign(
        { id: userIdStr, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      req = {
        headers: { authorization: `Bearer ${userToken}` },
        body: {},
      };
      req.user = undefined; // Reset

      await authMiddleware(req, res);

      // Compare IDs effectively
      if (req.user && String(req.user.id) === String(user.id)) {
        console.log("PASS: User authenticated and attached to req.user");
      } else {
        console.error("FAIL: User authentication failed. Req.user:", req.user);
      }
    } else {
      console.log(
        "\nTest 2: Verifying User Token... (SKIPPED - No User available)",
      );
    }

    // --- TEST 3: INACTIVE ADMIN ---
    console.log("\nTest 3: Verifying Inactive Admin...");
    await prisma.admin.update({
      where: { id: admin.id },
      data: { active: false },
    });

    req = {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {},
    };
    res = {
      code: function (c) {
        this.statusCode = c;
        return this;
      },
      send: function (b) {
        this.body = b;
      },
    };

    await authMiddleware(req, res);

    if (
      res.statusCode === 403 &&
      res.body.message === "Admin account is inactive"
    ) {
      console.log("PASS: Inactive Admin blocked correctly");
    } else {
      console.error(
        "FAIL: Inactive Admin not blocked. Status:",
        res.statusCode,
        "Body:",
        res.body,
      );
    }
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    // Cleanup
    if (admin) {
      try {
        await prisma.admin.delete({ where: { id: admin.id } });
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
    if (user && user.email === userEmail) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
      } catch (e) {
        console.error("Data cleanup error", e);
      }
    }
    await closeDatabaseConnections();
  }
}

runTest();
