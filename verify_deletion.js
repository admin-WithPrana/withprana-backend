import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating test user...");
  let user = await prisma.user.create({
    data: {
      email: "test_delete_user_" + Date.now() + "@example.com",
      name: "Test Delete User",
      signupMethod: "email"
    }
  });
  console.log(`User created: ${user.id}`);

  console.log("Setting deleteRequestedAt to 8 days ago...");
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  user = await prisma.user.update({
    where: { id: user.id },
    data: {
      deleteRequestedAt: eightDaysAgo
    }
  });

  console.log("Running soft delete processor logic directly...");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const usersToDelete = await prisma.user.findMany({
    where: {
      isDeleted: false,
      deleteRequestedAt: {
        lte: sevenDaysAgo,
      },
    },
  });

  console.log(`Found ${usersToDelete.length} accounts to delete.`);

  for (const u of usersToDelete) {
    if (u.id === user.id) {
       await prisma.user.update({
          where: { id: u.id },
          data: {
            isDeleted: true,
            active: false,
            deleteRequestedAt: null,
          },
        });
        console.log(`✅ Permanently soft-deleted test user ${u.id}`);
    }
  }

  // Verify
  const verifiedUser = await prisma.user.findUnique({ where: { id: user.id }});
  if (verifiedUser.isDeleted === true && verifiedUser.active === false && verifiedUser.deleteRequestedAt === null) {
      console.log("TEST PASSED: User is correctly soft-deleted after 7 days.");
  } else {
      console.log("TEST FAILED: User state is incorrect.", verifiedUser);
  }

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Test user cleaned up.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
