import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSchema() {
  console.log(
    'Attempting to add "systemDeactivated" column to "users" table...',
  );
  try {
    // raw SQL to add column safely
    // Using quotes for table and column names to ensure case sensitivity matches Prisma expectations if needed.
    // However, Prisma maps "users" (lowercase) in schema.
    // And systemDeactivated (camelCase).

    // We use executeRawUnsafe to run the ALTER TABLE
    // Fix OTPs ID sequence
    console.log("Fixing OTP id sequence...");
    try {
      await prisma.$executeRawUnsafe(
        `CREATE SEQUENCE IF NOT EXISTS otps_id_seq;`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "otps" ALTER COLUMN "id" SET DEFAULT nextval('otps_id_seq');`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE otps_id_seq OWNED BY "otps"."id";`,
      );

      // Also ensure categories/admins have it? The error was specific to Otp.
      // But might as well fix Admin if present. admin id is Int. Users is BigInt.

      console.log("OTP sequence fixed.");
    } catch (e) {
      console.log(
        "Error fixing OTP sequence (might already exist):",
        e.message,
      );
    }
    // Inspect OTPs table schema
    const otpsSchemaResult = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'otps';
    `;

    console.log("OTPs Table Schema:", otpsSchemaResult);

    // Inspect Users table schema
    const usersIdSchemaResult = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id';
    `;

    console.log("Users Table ID Schema:", usersIdSchemaResult);

    // Check sequences
    const sequences = await prisma.$queryRaw`
      SELECT * FROM information_schema.sequences;
    `;
    // console.log('Sequences:', sequences); // might be noisy

    // Add indices/constraints separately to avoid errors if they exist
    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");`,
      );
    } catch (e) {
      /* ignore if exists */
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");`,
      );
    } catch (e) {
      /* ignore if exists */
    }

    try {
      await prisma.$executeRawUnsafe(`
            ALTER TABLE "refresh_tokens" 
            ADD CONSTRAINT "refresh_tokens_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
    } catch (e) {
      /* ignore if exists */
    }

    console.log("Success! Schema checked/fixed.");
  } catch (error) {
    console.error("Error fixing schema:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
