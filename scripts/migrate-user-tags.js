import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserTags() {
  try {
    console.log('Starting user tags migration...');
    
    // Example: Migrate existing user preferences to tags
    const users = await prisma.user.findMany({
      where: {
        // Add conditions for users who need tag migration
        active: true
      }
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      // Example migration logic
      // You can add default tags based on user preferences, onboarding data, etc.
      
      // Get user's onboarding data
      const onboardingData = await prisma.onboardingOptionTag.findMany({
        where: {
          option: {
            // Add conditions based on your onboarding logic
          }
        },
        include: {
          tag: true
        }
      });

      // Create user tags based on onboarding selections
      if (onboardingData.length > 0) {
        const userTagsData = onboardingData.map(item => ({
          userId: user.id,
          tagId: item.tagId
        }));

        await prisma.userTag.createMany({
          data: userTagsData,
          skipDuplicates: true
        });

        console.log(`Migrated tags for user ${user.id}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateUserTags();
