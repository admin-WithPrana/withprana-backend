import { UserController } from '../controllers/userController.js';
import { PostgresOTPRepository } from '../../infrastructure/databases/postgres/otpRepository.js';
import {PrismaUserRepository}  from "../../infrastructure/databases/postgres/userRepository.js"

// userRoutes.js
export const setupRoutes = (app, { prismaRepository, mailer }) => {
  if (!prismaRepository || !prismaRepository.prisma) {
    throw new Error('Prisma client is not properly initialized');
  }

  const otpRepo = new PostgresOTPRepository(prismaRepository.prisma);
  const userRepo = new PrismaUserRepository(prismaRepository.prisma);

  const userController = new UserController(
    userRepo,
    otpRepo,
    mailer
  );

  app.post('/register', (request, reply) => userController.register(request, reply));
  app.post('/verify', (request, reply) => userController.verify(request, reply));
  app.post('/resend-otp', (request, reply) => userController.resendOTP(request, reply));
  app.post('/login', (request, reply) => userController.login(request, reply));
  app.get('/:id', (request, reply) => userController.getUserById(request, reply));
};