import { PrismaClient } from "@prisma/client";
import { decryptDeterministic, decrypt } from "../src/utils/encryption.js";

const prisma = new PrismaClient();

async function debugUsers() {
  console.log("Fetching all users from DB...");
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);

    for (const u of users) {
      let decEmail = "failed";
      try {
        decEmail = decryptDeterministic(u.email);
      } catch (e) {
        decEmail = "error: " + e.message;
      }

      console.log(
        `ID: ${u.id}, Email(Enc): ${u.email.substring(0, 15)}..., Email(Dec): ${decEmail}, Active: ${u.active}, SignupMethod: ${u.signupMethod}`,
      );
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUsers();
