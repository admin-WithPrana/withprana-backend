import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';

import { registerRoutes } from './interfaces/routes/index.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';
import { PostgresOTPRepository } from './infrastructure/databases/postgres/otpRepository.js';

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

  const { prisma, mongoClient } = await initializeDatabaseConnections();
  const mailer = initializeMailer();
  const otpRepository = new PostgresOTPRepository(prisma);

  const prismaRepository = { prisma };
  const mongoRepository = { mongo: mongoClient };

  await registerRoutes(app, {
    prismaRepository,
    mongoRepository,
    mailer,
    otpRepository
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
