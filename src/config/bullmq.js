import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./database.js";

const connection = new IORedis({
  host: "redis-10371.c52.us-east-1-4.ec2.redns.redis-cloud.com",
  port: 10371,
  username: "default",
  password: "uNd0A89euygYPfnr3lz3VHOeijxHD9DM",
  maxRetriesPerRequest: null,
});

// ----------------- Thought Queue -----------------
export const thoughtQueue = new Queue("thoughtOfTheDayQueue", { connection });
export const thoughtWorker = new Worker(
  "thoughtOfTheDayQueue",
  async (job) => {
    const { thoughtId } = job.data;
    await prisma.thoughtOfTheDay.update({
      where: { id: thoughtId },
      data: { status: "POSTED" },
    });
  },
  { connection },
);
thoughtWorker.on("failed", (job, err) => {
  console.error(`Thought job failed ${job.id} with error: ${err.message}`);
});

// ----------------- Meditation Queue -----------------
export const meditationQueue = new Queue("meditationQueue", { connection });
export const meditationWorker = new Worker(
  "meditationQueue",
  async (job) => {
    const { meditationId } = job.data;
    await prisma.meditation.update({
      where: { id: meditationId },
      data: { active: true },
    });
  },
  { connection },
);
meditationWorker.on("failed", (job, err) => {
  console.error(`Meditation job failed ${job.id} with error: ${err.message}`);
});

// ----------------- Inactivity Queue -----------------
import { InactivityService } from "../infrastructure/services/inactivityService.js";
import { generateAndUploadLogsPDF } from "../utils/generateSSRLogs.js";
const inactivityService = new InactivityService();
export const inactivityQueue = new Queue("inactivityQueue", { connection });
export const inactivityWorker = new Worker(
  "inactivityQueue",
  async (job) => {
    console.log("Checking inactivity...");
    await inactivityService.checkInactivity();
  },
  { connection },
);
inactivityWorker.on("failed", (job, err) => {
  console.error(`Inactivity job failed ${job.id} with error: ${err.message}`);
});

// ----------------- SAR Log Queue -----------------
export const sarLogQueue = new Queue("sarLogQueue", { connection });
export const sarLogWorker = new Worker(
  "sarLogQueue",
  async (job) => {
    const { userId, status } = job.data;
    console.log(job.data)

    await generateAndUploadLogsPDF(userId)
  },
  { connection }
);

sarLogWorker.on("failed", (job, err) => {
  console.error(`SAR log job failed ${job.id} with error: ${err.message}`);
});
