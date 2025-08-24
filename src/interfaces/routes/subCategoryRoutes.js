import { SubcategoryRepository } from "../../infrastructure/databases/postgres/subcategoryRepository.js";
import { SubcategoryUsecase } from "../../domain/usecases/subcategoryUsecase.js";
import { SubcategoryController } from "../controllers/subcategoryController.js";

export const subcategoryRoutes = async (app, { prismaRepository }) => {
  const repo = new SubcategoryRepository(prismaRepository.prisma);
  const usecase = new SubcategoryUsecase(repo);
  const controller = new SubcategoryController(usecase);

  app.post("/", (req, reply) => controller.create(req, reply));
  app.patch("/:id", (req, reply) => controller.update(req, reply));
  app.get("/", (req, reply) => controller.getAll(req, reply));
  app.get("/:id", (req, reply) => controller.getById(req, reply));
  app.delete("/:id", (req, reply) => controller.delete(req, reply));
};

