import { CategoryRepository } from '../../infrastructure/databases/postgres/categoryRepository.js';
import { CategoryUsecase } from '../../domain/usecases/categoryUsecase.js';
import { CategoryController } from '../controllers/categoryController.js';

export const categoryRoutes = (app, { prismaRepository }) => {
  const repo = new CategoryRepository(prismaRepository.prisma);
  const usecase = new CategoryUsecase(repo);
  const controller = new CategoryController(usecase);

  app.post('/', (req, reply) => controller.create(req, reply));
  app.get('/', (req, reply) => controller.getAll(req, reply));
  app.get('/:id', (req, reply) => controller.getById(req, reply));
  app.patch('/:id', (req, reply) => controller.update(req, reply));
  app.delete('/:id', (req, reply) => controller.delete(req, reply));
};