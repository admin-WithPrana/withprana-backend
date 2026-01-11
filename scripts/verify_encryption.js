import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { UserUseCases } from "../src/domain/usecases/userUseCases.js";
import { PrismaUserRepository } from "../src/infrastructure/databases/postgres/userRepository.js";
import { PostgresOTPRepository } from "../src/infrastructure/databases/postgres/otpRepository.js";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const otpRepository = new PostgresOTPRepository(prisma);

const mockMailer = {
  sendMail: async (options) => {
    console.log(`[MockMailer] Sending email to ${options.to}`);
  },
};

const userUseCases = new UserUseCases(
  userRepository,
  otpRepository,
  mockMailer
);

const TEST_EMAIL = "test_encryption@example.com";
const TEST_NAME = "Test Encryption User";

async function verifyEncryption() {
  try {
    console.log("Starting Encryption Verification...");

    // 1. Cleanup
    console.log("Cleaning up old test data...");
    // We need to delete by finding the user first?
    // Or just delete by email if we can find it?
    // Since email is encrypted in DB, we can't find it by plain email easily using direct prisma if we don't know the ciphertext.
    // BUT, we have correct keys in .env, so we can use useCases to find/delete?
    // UseCases doesn't have delete.

    // We can use the deterministic encryption to find the record to delete.
    // We need to import encryption util or rely on what we know.
    // Let's rely on UserUseCases to find it (it encrypts email) and then delete using prisma.

    // Actually, let's just try to register. If it fails (already exists), we might need to purge DB or handle it.
    // But for a clean script, let's try to delete using Prisma and the *encrypted* email if we can import the util.
    // Check if we can import util.
  } catch (err) {
    console.error("Setup failed:", err);
  }

  // To properly cleanup, let's use the encryption util
  const { encrypt, encryptDeterministic, decrypt } = await import(
    "../src/utils/encryption.js"
  );

  try {
    const encryptedEmail = encryptDeterministic(TEST_EMAIL);
    await prisma.user.deleteMany({ where: { email: encryptedEmail } });
    await prisma.otp.deleteMany({ where: { email: encryptedEmail } });
    console.log("Cleanup complete.");

    // 2. Register User
    console.log(`Registering user: ${TEST_EMAIL}, Name: ${TEST_NAME}`);
    const regResult = await userUseCases.registerUser({
      email: TEST_EMAIL,
      name: TEST_NAME,
      image: null,
      oauth: "false",
      method: 1,
    });
    console.log("Registration Result:", regResult.message);

    // Verify DB Content (Should be encrypted)
    const dbUser = await prisma.user.findUnique({
      where: { email: encryptedEmail },
    });
    console.log("DB User Name (Should be encrypted):", dbUser.name);
    console.log("DB User Email (Should be encrypted):", dbUser.email);

    if (dbUser.name === TEST_NAME)
      throw new Error("Name was NOT encrypted in DB!");
    if (dbUser.email === TEST_EMAIL)
      throw new Error("Email was NOT encrypted in DB!");
    if (dbUser.name.includes(":"))
      console.log("Name appears to be IV:Ciphertext format (Good).");

    // 3. Verify Retrieval (Should be decrypted)
    console.log("Retrieving user by ID...");
    const retrievedUser = await userUseCases.getUserById(dbUser.id);
    console.log("Retrieved User Email:", retrievedUser.email);
    console.log("Retrieved User Name:", retrievedUser.name);

    if (retrievedUser.email !== TEST_EMAIL)
      throw new Error(
        `Decryption failed! Expected ${TEST_EMAIL}, got ${retrievedUser.email}`
      );
    if (retrievedUser.name !== TEST_NAME)
      throw new Error(
        `Decryption failed! Expected ${TEST_NAME}, got ${retrievedUser.name}`
      );

    console.log(
      "✅ VERIFICATION SUCCESSFUL: Data is encrypted in DB and decrypted on retrieval."
    );

    // 4. Verify Middleware Token Decryption
    console.log("Verifying Middleware Token Decryption...");
    const { authMiddleware } = await import(
      "../src/interfaces/middleware/authMiddleware.js"
    );

    // Generate token (now contains encrypted payload)
    const token = userUseCases.generateToken(retrievedUser);
    console.log(
      "Generated Token (First 20 chars):",
      token.substring(0, 20) + "..."
    );

    // Mock Req/Res/Next
    const req = {
      headers: { authorization: `Bearer ${token}` },
      body: { existingField: "should_persist" },
    };
    const res = {
      status: (code) => ({
        json: (data) => console.log(`[Middleware Response ${code}]`, data),
      }),
    };
    const next = () => {
      console.log("Middleware called next()");
    };

    // Run Middleware
    authMiddleware(req, res, next);

    console.log("Middleware Result req.user.email:", req.user.email);
    console.log("Middleware Result req.body.email:", req.body.email);

    if (req.user.email !== TEST_EMAIL)
      throw new Error("Middleware failed to decrypt email in req.user");
    if (req.body.email !== TEST_EMAIL)
      throw new Error("Middleware failed to inject email into req.body");
    if (req.user.name !== TEST_NAME)
      throw new Error("Middleware failed to decrypt name in req.user");

    console.log(
      "✅ MIDDLEWARE VERIFICATION SUCCESSFUL: Token carries encrypted payload which middleware decrypts."
    );
  } catch (error) {
    console.error("❌ VERIFICATION FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEncryption();
