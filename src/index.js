import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';

import { registerRoutes } from './interfaces/routes/index.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';
import rateLimit from '@fastify/rate-limit';
import {thoughtQueue,meditationQueue} from './config/bullmq.js';

const startServer = async () => {
  const app = fastify({ logger: true });


  BigInt.prototype.toJSON = function () {
    return this.toString();
  };


  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(rateLimit, {
    max: 60, // each user/IP can make 60 requests per minute
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'], 
    keyGenerator: (req) => req.user?.id || req.ip,
    errorResponseBuilder: (req, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: 'You’re going a little fast — please relax and try again soon 🧘‍♂️',
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
    meditationQueue
  });

  try {
    const address = await app.listen({
      port: process.env.PORT || 3000,
      host: '0.0.0.0'
    });
    app.log.info(`🚀 Server running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
