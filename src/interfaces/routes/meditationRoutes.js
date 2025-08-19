import { MeditationRepository } from '../../infrastructure/databases/postgres/meditationRepository.js';
import { MeditationUsecase } from '../../domain/usecases/meditationUsecase.js';
import { MeditationController } from '../controllers/meditationController.js';

export const meditatioRoutes = (app, { prismaRepository }) => {
  const repo = new MeditationRepository(prismaRepository.prisma);
  const usecase = new MeditationUsecase(repo);
  const controller = new MeditationController(usecase);

  app.post('/', (req, reply) => controller.create(req, reply));
  app.get('/', (req, reply) => controller.getAll(req, reply));
  app.get('/:id', (req, reply) => controller.getById(req, reply));
  app.patch('/:id', (req, reply) => controller.update(req, reply));
  app.delete('/:id', (req, reply) => controller.delete(req, reply));
};