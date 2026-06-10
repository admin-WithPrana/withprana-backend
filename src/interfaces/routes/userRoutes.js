import { UserController } from "../controllers/userController.js";
import { PostgresOTPRepository } from "../../infrastructure/databases/postgres/otpRepository.js";
import { PrismaUserRepository } from "../../infrastructure/databases/postgres/userRepository.js";
import { NotificationService } from "../../infrastructure/services/notificationService.js";
import fastifyMultipart from "@fastify/multipart";
import { LoginHistoryRepository } from "../../infrastructure/databases/postgres/loginHistoryRepository.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { uploadToS3 } from "../../infrastructure/services/uploadToS3.js";

import { SubscriptionRepository } from "../../infrastructure/databases/postgres/SubscriptionRepository.js";
import { QrRepository } from "../../infrastructure/databases/postgres/qrRepository.js";

export const setupRoutes = (app, { prismaRepository, mailer, sseService, stripeService }) => {
  if (!prismaRepository || !prismaRepository.prisma) {
    throw new Error("Prisma client is not properly initialized");
  }

  const otpRepo = new PostgresOTPRepository(prismaRepository.prisma);
  const userRepo = new PrismaUserRepository(prismaRepository.prisma);
  const loginHistoryRepository = new LoginHistoryRepository(
    prismaRepository.prisma,
  );
  const subscriptionRepo = new SubscriptionRepository(prismaRepository.prisma);
  const notificationService = new NotificationService();
  const qrRepo = new QrRepository(prismaRepository.prisma);

  const userController = new UserController(
    userRepo,
    otpRepo,
    notificationService,
    loginHistoryRepository,
    subscriptionRepo,
    qrRepo,
    sseService,
    stripeService
  );

  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
    attachFieldsToBody: true,
  });

  app.post("/register", async (request, reply) => {
    try {
      const { name, email, profilePicture, oauth, method } = request.body;
      let profilePictureUrl = null;

      if (
        profilePicture &&
        typeof profilePicture.value === "string" &&
        profilePicture.value.trim() !== ""
      ) {
        profilePictureUrl = profilePicture.value;
      }

      if (profilePicture?.file) {
        let image = await uploadToS3(profilePicture, "images");
        profilePictureUrl = image[0];
      }

      const payload = {
        name: name && typeof name === "object" ? name.value : name,
        email: email && typeof email === "object" ? email.value : email,
        oauth: oauth && typeof oauth === "object" ? oauth.value : oauth,
        method: method && typeof method === "object" ? method.value : method,
        image: profilePictureUrl,
        device:
          request.body.device &&
          typeof request.body.device === "object" &&
          request.body.device.value
            ? request.body.device.value
            : request.body.device,
      };

      await userController.register({ ...request, body: payload }, reply);
    } catch (error) {
      console.error("User registration error:", error);
      reply.status(500).send({
        error: "Failed to register user",
        details: error.message,
      });
    }
  });

  app.post("/verify", (request, reply) =>
    userController.verify(request, reply),
  );
  app.post("/resend-otp", (request, reply) =>
    userController.resendOTP(request, reply),
  );
  app.post("/check-email", (request, reply) =>
    userController.checkEmail(request, reply),
  );
  app.post("/login", (request, reply) => userController.login(request, reply));
  app.post("/logout", { preHandler: authMiddleware }, (request, reply) =>
    userController.logout(request, reply),
  );

  app.get("/qr/generate", (request, reply) => userController.generateQr(request, reply));
  app.get("/qr/status", (request, reply) => userController.checkQrStatus(request, reply));
  app.get("/qr/sse", (request, reply) => userController.qrSse(request, reply));
  app.post("/qr/verify", { preHandler: authMiddleware }, (request, reply) => userController.verifyQr(request, reply));

  app.post("/refresh-token", (request, reply) =>
    userController.refresh(request, reply),
  );

  app.get("/:id", { preHandler: [authMiddleware] }, (request, reply) =>
    userController.getUserById(request, reply),
  );

  app.patch(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name, profilePicture } = request.body;

        let profilePictureUrl = undefined;

        if (profilePicture) {
          if (profilePicture?.file) {
            let image = await uploadToS3(profilePicture, "images");
            profilePictureUrl = image[0];
          } else if (
            typeof profilePicture === "string" &&
            profilePicture.trim() !== ""
          ) {
            profilePictureUrl = profilePicture;
          }
        }

        const payload = {
          name: typeof name === "object" ? name.value : name,
        };

        if (profilePictureUrl !== "") {
          payload.image = profilePictureUrl;
        }

        await userController.updateUser(
          { ...request, params: { id }, body: payload, user: request.user },
          reply,
        );
      } catch (error) {
        console.error("User update error:", error);
        reply.status(500).send({
          error: "Failed to update user",
          details: error.message,
        });
      }
    },
  );

  app.delete("/:id", { preHandler: [authMiddleware] }, (request, reply) =>
    userController.deleteUser(request, reply),
  );
};
