import { PlaylistRepository } from "../../infrastructure/databases/postgres/playlistRepository.js";
import { PlaylistUsecase } from "../../domain/usecases/playlistUsecase.js";
import { PlaylistController } from "../controllers/playlistController.js";

export const playlistRoutes = async (app, { prismaRepository }) => {
  const repo = new PlaylistRepository(prismaRepository.prisma);
  const usecase = new PlaylistUsecase(repo);
  const controller = new PlaylistController(usecase);
  
  app.post("/", (req, reply) => controller.create(req, reply));
  app.patch("/:id", (req, reply) => controller.update(req, reply));
  app.get("/", (req, reply) => controller.getAll(req, reply));
  app.get("/:id", (req, reply) => controller.getById(req, reply));
  app.delete("/:id", (req, reply) => controller.delete(req, reply));
  app.post("/:id/meditations", (req, reply) => controller.addMeditations(req, reply));
  app.delete("/:id/meditations/:meditationId", (req, reply) => controller.removeMeditation(req, reply));
};