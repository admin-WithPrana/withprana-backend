import { UserController } from '../controllers/userController.js';
import { PostgresOTPRepository } from '../../infrastructure/databases/postgres/otpRepository.js';

export const setupRoutes = (app, { pgClient, pgRepository, mongoRepository, mailer }) => {
  console.log(pgClient)
  const otpRepo = new PostgresOTPRepository(pgClient);

  const userController = new UserController(
    pgRepository,
    otpRepo,
    mailer
  );

  app.post('/register', (request, reply) => userController.register(request, reply));
  app.post('/verify', (request, reply) => userController.verify(request, reply));
  app.post('/resend-otp', (request, reply) => userController.resendOTP(request, reply));
};
