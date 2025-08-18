import { UserController } from '../controllers/userController.js';
import { PostgresOTPRepository } from '../../infrastructure/databases/postgres/otpRepository.js';

export const setupRoutes = (app, { prismaRepository, mongoRepository, mailer }) => {
  const otpRepo = new PostgresOTPRepository(prismaRepository.prisma);

  const userController = new UserController(
    prismaRepository,
    otpRepo,
    mailer
  );

  app.post('/register', (request, reply) => userController.register(request, reply));
  app.post('/verify', (request, reply) => userController.verify(request, reply));
  app.post('/resend-otp', (request, reply) => userController.resendOTP(request, reply));
  app.post('/login', (request, reply) => userController.login(request, reply));
};