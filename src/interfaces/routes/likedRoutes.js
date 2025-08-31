import { LikedUsecase } from '../../domain/usecases/likedUsecase.js';
import { LikedController } from '../controllers/likedController.js';
import { LikedRepository } from '../../infrastructure/databases/postgres/likedRepository.js';
import { MeditationRepository } from '../../infrastructure/databases/postgres/meditationRepository.js';

export const likedRoutes = (app, { prismaRepository }) => {
  const likedRepository = new LikedRepository(prismaRepository.prisma);
  const meditationRepository = new MeditationRepository(prismaRepository.prisma); // for validation in usecase
  const likedUsecase = new LikedUsecase(likedRepository, meditationRepository);
  const likedController = new LikedController(likedUsecase);

  app.post('/like', (req, reply) => likedController.likeMeditation(req, reply));
  app.delete('/dislike', (req, reply) => likedController.dislikeMeditation(req, reply));
  app.get('/user/:userId', (req, reply) => likedController.getLikedMeditations(req, reply));
  app.get('/check', (req, reply) => likedController.isMeditationLiked(req, reply));
};
