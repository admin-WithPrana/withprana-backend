import { setupRoutes } from "./userRoutes.js";
import { adminRoutes } from "./adminRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { categoryRoutes } from "./categoryRoutes.js";
import { meditationRoutes } from "./meditationRoutes.js";
import { subcategoryRoutes } from "./subCategoryRoutes.js";
import { tagsRoutes } from "./tagRoutes.js";
import { likedRoutes } from "./likedRoutes.js";
import { thoughtRoutes } from "./thoughOfTheDayRoute.js";
import { playlistRoutes } from "./playListRoutes.js";
import { policyRoutes } from "./privacyPolicyRoutes.js";
import { onboardingRoutes } from "./onBoardingRoutes.js";
import { userTagsRoutes } from "./userTagRoutes.js";
import { setupSubscriptionRoutes } from "./subscriptionRoutes.js";

export async function registerRoutes(app, deps) {
  // ------------------------ USER ROUTES ------------------------
  app.register(async function (userScope) {
    setupRoutes(userScope, {
      prismaRepository: deps.prismaRepository,
      mailer: deps.mailer,
    });
  }, { prefix: "/api/user" });

  // ------------------------ ADMIN ROUTES ------------------------
  app.register(async function (adminScope) {
    adminRoutes(adminScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/admin" });

  // ------------------------ AUTH ROUTES ------------------------
  app.register(async function (authScope) {
    authRoutes(authScope, {
      prismaRepository: deps.prismaRepository,
      mailer: deps.mailer,
    });
  }, { prefix: "/api/auth" });

  // ------------------------ CATEGORY ROUTES ------------------------
  app.register(async function (categoryScope) {
    categoryRoutes(categoryScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/category" });

  // ------------------------ MEDITATION ROUTES ------------------------
  app.register(async function (meditationScope) {
    meditationRoutes(meditationScope, {
      prismaRepository: deps.prismaRepository,
      mongoRepository: deps.mongoRepository,
    });
  }, { prefix: "/api/meditation" });

  // ------------------------ SUBCATEGORY ROUTES ------------------------
  app.register(async function (subcategoryScope) {
    subcategoryRoutes(subcategoryScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/subcategory" });

  // ------------------------ TAGS ROUTES ------------------------
  app.register(async function (tagsScope) {
    tagsRoutes(tagsScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/tags" });

  // ------------------------ LIKED ROUTES ------------------------
  app.register(async function (likedScope) {
    likedRoutes(likedScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/liked" });

  // ------------------------ THOUGHT ROUTES ------------------------
  app.register(async function (thoughtScope) {
    thoughtRoutes(thoughtScope, {
      prismaRepository: deps.prismaRepository,
      postQueue: deps.postQueue,
    });
  }, { prefix: "/api/thought" });

  // ------------------------ PLAYLIST ROUTES ------------------------
  app.register(async function (playlistScope) {
    playlistRoutes(playlistScope, {
      prismaRepository: deps.prismaRepository,
      postQueue: deps.postQueue,
    });
  }, { prefix: "/api/playlist" });

  // ------------------------ PRIVACY POLICY ROUTES ------------------------
  app.register(async function (privacyPolicyScope) {
    policyRoutes(privacyPolicyScope, {
      prismaRepository: deps.prismaRepository,
      postQueue: deps.postQueue,
    });
  }, { prefix: "/api/privacy-policy" });

  // ------------------------ ONBOARDING ROUTES ------------------------
  app.register(async function (onboardScope) {
    onboardingRoutes(onboardScope, {
      prismaRepository: deps.prismaRepository,
      postQueue: deps.postQueue,
    });
  }, { prefix: "/api/onboard" });

  // ------------------------ USER TAGS ROUTES ------------------------
  app.register(async function (tagsScope) {
    userTagsRoutes(tagsScope, { prismaRepository: deps.prismaRepository });
  }, { prefix: "/api/usertags" });

  // ------------------------ SUBSCRIPTION ROUTES ------------------------
  app.register(async function (subscriptionScope) {
    const userRepository = deps.userRepository || {
      findById: (id) =>
        deps.prismaRepository.prisma.user.findUnique({ where: { id: BigInt(id) } }),
      updateUserStripeCustomerId: (userId, stripeCustomerId) =>
        deps.prismaRepository.prisma.user.update({ where: { id: BigInt(userId) }, data: { stripeCustomerId } }),
    };
  
    setupSubscriptionRoutes(subscriptionScope, {
      prismaRepository: deps.prismaRepository,
      userRepository,
    });
  }, { prefix: "/api/subscriptions" });
  
}
