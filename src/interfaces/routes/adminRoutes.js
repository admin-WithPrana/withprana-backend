import { UserUseCases } from '../../domain/usecases/userUseCases.js';
import { AdminController } from '../controllers/adminController.js';
import { PrismaUserRepository } from '../../infrastructure/databases/postgres/userRepository.js';

export const adminRoutes = (app, { prismaRepository, otpRepository, mailer }) => {
  const userRepository = new PrismaUserRepository(prismaRepository.prisma);
  const userUseCases = new UserUseCases(userRepository, otpRepository, mailer);
  const adminController = new AdminController(userUseCases);

  app.get('/users', (req, reply) => adminController.getUsers(req, reply));
  app.get('/users/:id', (req, reply) => adminController.getUserById(req, reply));
  app.patch('/users/:id/deactivate', (req, reply) => adminController.deactivateUser(req, reply));
  app.patch('/users/:id/activate', (req, reply) => adminController.activateUser(req, reply));
};