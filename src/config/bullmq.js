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

// ----------------- Push Notification Queue -----------------
import pushNotificationService from "../infrastructure/services/pushNotificationService.js";

export const pushQueue = new Queue("pushNotificationQueue", { connection });
export const pushWorker = new Worker(
  "pushNotificationQueue",
  async (job) => {
    const { title, message, imageUrl, sendToAllSubscribed } = job.data;
    
    if (sendToAllSubscribed) {
      // Broadcast mode relies on OneSignal internal logic
      await pushNotificationService.sendNotification({
        title,
        message,
        imageUrl,
        sendToAllSubscribed: true
      });
    } else {
      // Chunked delivery using customer database IDs
      const batchSize = 10000;
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        // Fetch specific user customer IDs efficiently in chunks
        const users = await prisma.user.findMany({
          select: { id: true, active: true },
          where: { active: true },
          skip,
          take: batchSize
        });

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        const ids = users.map(u => String(u.id));
        await pushNotificationService.sendNotification({
          recipients: ids,
          title,
          message,
          imageUrl
        });

        // Scalably save the isolated notification arrays into database
        const historyPayload = users.map(u => ({
          userId: String(u.id),
          title: title || "New Notification",
          message: message || "",
          imageUrl: imageUrl || null
        }));

        await prisma.notification.createMany({
          data: historyPayload,
          skipDuplicates: true
        });

        skip += batchSize;
      }
    }
  },
  { connection },
);

pushWorker.on("failed", (job, err) => {
  console.error(`Push job failed ${job.id} with error: ${err.message}`);
});

// ----------------- Meditation Queue -----------------
export const meditationQueue = new Queue("meditationQueue", { connection });
export const meditationWorker = new Worker(
  "meditationQueue",
  async (job) => {
    const { meditationId } = job.data;
    const updatedMeditation = await prisma.meditation.update({
      where: { id: meditationId },
      data: { active: true },
      select: { title: true, thumbnail: true }
    });

    // Schedule background broadcast of unlocked meditation across the 200,000+ base
    await pushQueue.add("newMeditationPush", {
      title: "New Meditation Released!",
      message: `"${updatedMeditation.title}" is now available to listen to.`,
      imageUrl: updatedMeditation.thumbnail,
      sendToAllSubscribed: false // Passing false triggers the massive DB batching chunking loop you configured
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
export const sarLogQueue = new Queue("createSARLog", { connection });
export const sarLogWorker = new Worker(
  "createSARLog",
  async (job) => {
    const { userId, status } = job.data;

    const url = await generateAndUploadLogsPDF(userId)
    await prisma.sARLogRequest.create({
      data: {
        userId,
        status,
        doc: url
      }
    })
  },
  { connection }
);

sarLogWorker.on("failed", (job, err) => {
  console.error(`SAR log job failed ${job.id} with error: ${err.message}`);
});
