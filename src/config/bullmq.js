import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from './database.js';

// Connect to Redis
const connection = new IORedis({
  host: 'redis-10371.c52.us-east-1-4.ec2.redns.redis-cloud.com',
  port: 10371,
  username: 'default',
  password: 'uNd0A89euygYPfnr3lz3VHOeijxHD9DM',
  maxRetriesPerRequest: null,
});

export const postQueue = new Queue('thoughtOfTheDayQueue', { connection });

// Worker to process jobs (publish thoughts)
export const postWorker = new Worker('thoughtOfTheDayQueue', async job => {
  const { thoughtId } = job.data;

  await prisma.thoughtOfTheDay.update({
    where: { id: thoughtId },
    data: { status: 'POSTED'}
  });

}, { connection });

// Handle worker errors
postWorker.on('failed', (job, err) => {
  console.error(`Job failed ${job.id} with error: ${err.message}`);
});
