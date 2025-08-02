import fastify from 'fastify';
import { setupRoutes } from './interfaces/routes/userRoutes.js';
import { initializeDatabaseConnections } from './config/database.js';
import { initializeMailer } from './config/mail.js';

const startServer = async () => {
  const app = fastify({ logger: true });

  const { pgClient,pgRepository, mongoRepository } = await initializeDatabaseConnections();

  const mailer = initializeMailer();

  setupRoutes(app, { pgClient,pgRepository, mongoRepository, mailer });

  try {
    await app.listen({ port: 3000, host: 'localhost' });
    app.log.info(`Server listening on ${app.server.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();