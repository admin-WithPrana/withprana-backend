import { OnBoardingRepository } from "../../infrastructure/databases/postgres/OnboardingRepository.js";
import { OnBoardingUsecase } from "../../domain/usecases/onBoardingUsecase.js";
import { OnBoardingController } from "../controllers/onBoardingController.js";

export const onboardingRoutes = async (app, { prismaRepository }) => {
  const repo = new OnBoardingRepository(prismaRepository.prisma);
  const usecase = new OnboardingUsecase(repo);
  const controller = new OnboardingController(usecase);
  
  // Admin routes for managing questions
  app.post("/", (req, reply) => controller.createQuestion(req, reply));
  app.put("/:id", (req, reply) => controller.updateQuestion(req, reply));
  app.get("/", (req, reply) => controller.getAllQuestions(req, reply));
  app.get("/table", (req, reply) => controller.getQuestionsPaginated(req, reply));
  app.get("/:id", (req, reply) => controller.getQuestionById(req, reply));
  app.delete("/:id", (req, reply) => controller.deleteQuestion(req, reply));
  
//   // User routes for onboarding flow
//   app.post("/users/:userId/responses", (req, reply) => controller.saveResponse(req, reply));
//   app.get("/users/:userId/responses", (req, reply) => controller.getUserResponses(req, reply));
//   app.get("/users/:userId/recommendations", (req, reply) => controller.getRecommendations(req, reply));
};