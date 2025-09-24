import { PolicyRepository } from "../../infrastructure/databases/postgres/privacyPolicyRepository.js";
import { PolicyUsecase } from "../../domain/usecases/privacyPolicyUsecase.js";
import { PolicyController } from "../controllers/privacyPolicyController.js";

export const policyRoutes = async (app, { prismaRepository }) => {
  const repo = new PolicyRepository(prismaRepository.prisma);
  const usecase = new PolicyUsecase(repo);
  const controller = new PolicyController(usecase);
  
  app.post("/:type", (req, reply) => controller.create(req, reply));
  app.patch("/:type/:id", (req, reply) => controller.update(req, reply));
  app.get("/:type", (req, reply) => controller.getAllByType(req, reply));
  app.get("/:type/:id", (req, reply) => controller.getById(req, reply));
  app.get("/:type/version/:version", (req, reply) => controller.getByVersion(req, reply));
  app.get("/:type/latest/active", (req, reply) => controller.getLatestActive(req, reply));
  app.delete("/:type/:id", (req, reply) => controller.delete(req, reply));
  
  app.get("/", (req, reply) => controller.getAll(req, reply));
};