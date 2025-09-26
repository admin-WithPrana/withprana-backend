import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function backupAndMigrate() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${timestamp}.sql`;
  
  try {
    console.log('Creating database backup...');
    
    // Create backup (adjust connection string as needed)
    const backupCommand = `pg_dump "${process.env.DATABASE_URL}" > ${backupFile}`;
    await execAsync(backupCommand);
    console.log(`Backup created: ${backupFile}`);

    // Run your migration
    console.log('Running migration...');
    await runMigration();
    
    console.log('Migration completed successfully!');
    console.log(`Backup available at: ${backupFile}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('Restoring from backup...');
    
    // Restore from backup
    const restoreCommand = `psql "${process.env.DATABASE_URL}" < ${backupFile}`;
    await execAsync(restoreCommand);
    console.log('Database restored from backup');
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function runMigration() {
  // Your migration logic here
  // Example: Migrate user preferences to tags
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    // Add default tags or migrate existing data
    // This is just an example
  }
}

// Run the backup and migrate process
backupAndMigrate();
