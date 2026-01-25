import { PrismaClient } from "@prisma/client";
import {
  encryptDeterministic,
  encrypt,
  generateUserKey,
  encryptUserKey,
} from "../src/utils/encryption.js";

const prisma = new PrismaClient();

async function restoreUser() {
  const targetId = "7c7e0bd0-e020-4400-944a-b550a9dd1b9b";

  console.log(`Attempting to restore user: ${targetId}`);

  try {
    // Check if exists first
    const existing = await prisma.user.findUnique({ where: { id: targetId } });
    if (existing) {
      console.log(
        "User already exists! Issue might be active status or something else.",
      );
      console.log("Active:", existing.active);
      console.log("Verified:", existing.isVerified);

      // Ensure active
      if (!existing.active) {
        await prisma.user.update({
          where: { id: targetId },
          data: { active: true, isVerified: true },
        });
        console.log("Fixed: User reactivated.");
      }
      return;
    }

    // Create if missing
    console.log("User missing. Re-creating...");

    // Crypto setup
    const userKey = generateUserKey();
    const encryptedUserKey = encryptUserKey(userKey);
    const email = "x2cvicious125@gmail.com"; // From user's snippet

    await prisma.user.create({
      data: {
        id: targetId, // Force specific ID
        email: encryptDeterministic(email.toLowerCase()),
        name: encrypt("Neehar", userKey), // Encrypt with user key
        signupMethod: "email",
        active: true,
        isVerified: true,
        encryptedUserKey: encryptedUserKey,
      },
    });

    console.log(`SUCCESS: User ${targetId} restored.`);
  } catch (error) {
    console.error("Restoration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreUser();
