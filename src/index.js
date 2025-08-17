import fastify from 'fastify';
import { setupRoutes } from './interfaces/routes/userRoutes.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';

const startServer = async () => {
  const app = fastify({ logger: true });

  const { prisma, prismaRepository, mongoRepository } = await initializeDatabaseConnections();

  const mailer = initializeMailer();

  setupRoutes(app, { prisma, prismaRepository, mongoRepository, mailer });

  try {
    await app.listen({ port: process.env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on ${app.server.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
