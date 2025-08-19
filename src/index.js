import fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './interfaces/routes/index.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';

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

  const { prisma, prismaRepository, mongoRepository } = await initializeDatabaseConnections();
  const mailer = initializeMailer();

  await registerRoutes(app, { prisma, prismaRepository, mongoRepository, mailer });

  try {
  const address = app.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  app.log.info(`Server server running at ${address}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
};

startServer();
