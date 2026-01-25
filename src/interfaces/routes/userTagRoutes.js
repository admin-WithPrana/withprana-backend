import { userTagsRepository } from "../../infrastructure/databases/postgres/userTagsRepository.js";
import { userTagsUsecase } from "../../domain/usecases/userTagsUsecase.js";
import { userTagsController } from "../controllers/userTagsController.js";

export const userTagsRoutes = async (app, { prismaRepository }) => {
  const repo = new userTagsRepository(prismaRepository.prisma);
  const usecase = new userTagsUsecase(repo);
  const controller = new userTagsController(usecase);

  app.post("/", (req, reply) => controller.addTags(req, reply));
};