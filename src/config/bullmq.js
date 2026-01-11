import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from './database.js';


const connection = new IORedis({
  host: 'redis-10371.c52.us-east-1-4.ec2.redns.redis-cloud.com',
  port: 10371,
  username: 'default',
  password: 'uNd0A89euygYPfnr3lz3VHOeijxHD9DM',
  maxRetriesPerRequest: null,
});


export const thoughtQueue = new Queue('thoughtOfTheDayQueue', { connection });

export const thoughtWorker = new Worker(
  'thoughtOfTheDayQueue',
  async (job) => {
    const { thoughtId } = job.data;
    await prisma.thoughtOfTheDay.update({
      where: { id: thoughtId },
      data: { status: 'POSTED' },
    });
  },
  { connection }
);

thoughtWorker.on('failed', (job, err) => {
  console.error(`Thought job failed ${job.id} with error: ${err.message}`);
});


export const meditationQueue = new Queue('meditationQueue', { connection });

export const meditationWorker = new Worker(
  'meditationQueue',
  async (job) => {
    const { meditationId } = job.data;
    await prisma.meditation.update({
      where: { id: meditationId },
      data: { active: true },
    });
  },
  { connection }
);

meditationWorker.on('failed', (job, err) => {
  console.error(`Meditation job failed ${job.id} with error: ${err.message}`);
});