import { SettingsUsecase } from "../../domain/usecases/settingsUsecase.js";
import { PostgresSettingsRepository } from "../../infrastructure/databases/postgres/settingsRepository.js";
import { SettingsController } from "../controllers/settingsController.js";

export const settingsRoutes = async (app, { prismaRepository }) => {
  const repo = new PostgresSettingsRepository(prismaRepository.prisma);
  const usecase = new SettingsUsecase(repo);
  const controller = new SettingsController(usecase);

  app.post("/", (req, reply) => controller.createOrUpdate(req, reply));
  app.get("/", (req, reply) => controller.get(req, reply));
};
