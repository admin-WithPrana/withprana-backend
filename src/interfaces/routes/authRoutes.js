import { AuthRepository } from '../../infrastructure/databases/postgres/adminAuthRepository.js';
import { AuthUsecase } from '../../domain/usecases/auth/authUsecase.js';
import { AuthController } from '../controllers/authController.js';

export const authRoutes = (app, { prismaRepository }) => {
  const authRepo = new AuthRepository(prismaRepository.prisma);
  const authUsecase = new AuthUsecase(authRepo);
  const authController = new AuthController(authUsecase);

  app.post('/login', (req, reply) => authController.login(req, reply));
};
