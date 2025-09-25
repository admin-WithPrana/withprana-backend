import { PolicyRepository } from "../../infrastructure/databases/postgres/privacyPolicyRepository.js";
import { PolicyUsecase } from "../../domain/usecases/privacyPolicyUsecase.js";
import { PolicyController } from "../controllers/privacyPolicyController.js";

export const policyRoutes = async (app, { prismaRepository }) => {
  const repo = new PolicyRepository(prismaRepository.prisma);
  const usecase = new PolicyUsecase(repo);
  const controller = new PolicyController(usecase);
  
  app.post("/:type", (req, reply) => controller.create(req, reply));
  app.get("/:type", (req, reply) => controller.getById(req, reply));
};