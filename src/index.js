import "dotenv/config";
import fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./interfaces/routes/index.js";
import { initializeDatabaseConnections } from "./config/database.js";
import { initializeMailer } from "./config/mail.js";
import { PostgresOTPRepository } from "./infrastructure/databases/postgres/otpRepository.js";
// import { postQueue } from './config/bullmq.js';
import fastifyRawBody from "fastify-raw-body";
import rateLimit from "@fastify/rate-limit";
import {
  thoughtQueue,
  meditationQueue,
  inactivityQueue,
} from "./config/bullmq.js";

const startServer = async () => {
  const app = fastify({ logger: true });

  BigInt.prototype.toJSON = function () {
    return this.toString();
  };

  await app.register(fastifyRawBody, {
    field: "rawBody", // request.rawBody will be set
    global: false, // only apply to routes with config.rawBody = true
    encoding: false, // keep it as Buffer, not string!
    runFirst: true, // ensures it runs before any other body parser
  });

  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(rateLimit, {
    max: 60, // each user/IP can make 60 requests per minute
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
    keyGenerator: (req) => req.user?.id || req.ip,
    errorResponseBuilder: (req, context) => ({
      code: 429,
      error: "Too Many Requests",
      message:
        "You’re going a little fast — please relax and try again soon 🧘‍♂️",
    }),
  });

  const { prisma, mongoClient } = await initializeDatabaseConnections();
  const mailer = initializeMailer();

  const prismaRepository = { prisma };
  const mongoRepository = { mongo: mongoClient };

  await registerRoutes(app, {
    prismaRepository,
    mongoRepository,
    mailer,
    thoughtQueue,
    meditationQueue,
  });

  try {
    const address = await app.listen({
      port: process.env.PORT || 3000,
      host: "0.0.0.0",
    });
    app.log.info(`🚀 Server running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();

// Schedule inactivity check daily
inactivityQueue.add(
  "checkInactivity",
  {},
  {
    repeat: {
      pattern: "0 0 * * *", // Run once a day at midnight
    },
  },
);
