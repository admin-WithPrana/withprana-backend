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
    const result = await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "systemDeactivated" BOOLEAN NOT NULL DEFAULT false;
    `);

    // Also adding fcm_token based on new error
    const result2 = await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
    `);

    // Create refresh_tokens table (missing per user report)
    const result3 = await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "userId" BIGINT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
      );
    `);

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

    console.log("Success! Results:", { result, result2, result3 });
    console.log('Columns "systemDeactivated" and "fcm_token" checked/added.');
    console.log('Table "refresh_tokens" created (if not existed).');
  } catch (error) {
    console.error("Error fixing schema:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
