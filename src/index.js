import dotenv from 'dotenv';
dotenv.config();
import fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './interfaces/routes/index.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';
import { PostgresOTPRepository } from './infrastructure/databases/postgres/otpRepository.js';
import { postQueue } from './config/bullmq.js';
import fastifyRawBody from 'fastify-raw-body';

const startServer = async () => {
  const app = fastify({ logger: true });


  BigInt.prototype.toJSON = function () {
    return this.toString();
  };

  await app.register(fastifyRawBody, {
    field: 'rawBody',   // request.rawBody will be set
    global: false,       // only apply to routes with config.rawBody = true
    encoding: false,     // keep it as Buffer, not string!
    runFirst: true       // ensures it runs before any other body parser
  });


  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const { prisma, mongoClient } = await initializeDatabaseConnections();
  const mailer = initializeMailer();

  const prismaRepository = { prisma };
  const mongoRepository = { mongo: mongoClient };

  await registerRoutes(app, {
    prismaRepository,
    mongoRepository,
    mailer,
    postQueue
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
