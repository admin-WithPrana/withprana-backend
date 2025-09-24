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

export async function registerRoutes(app, deps) {
  app.register(
    async function (userScope) {
      setupRoutes(userScope, {
        prismaRepository: deps.prismaRepository,
        mailer: deps.mailer,
      });
    },
    { prefix: "/api/user" }
  );

  app.register(
    async function (adminScope) {
      adminRoutes(adminScope, {
        prismaRepository: deps.prismaRepository,
      });
    },
    { prefix: "/api/admin" }
  );

  app.register(
    async function (authScope) {
      authRoutes(authScope, {
        prismaRepository: deps.prismaRepository,
        mailer: deps.mailer,
      });
    },
    { prefix: "/api/auth" }
  );

  app.register(
    async function (categoryScope) {
      categoryRoutes(categoryScope, {
        prismaRepository: deps.prismaRepository,
      });
    },
    { prefix: "/api/category" }
  );

  app.register(
    async function (meditationScope) {
      meditationRoutes(meditationScope, {
        prismaRepository: deps.prismaRepository,
        mongoRepository: deps.mongoRepository,
      });
    },
    { prefix: "/api/meditation" }
  );

  app.register(
    async function (subcategoryScope) {
      subcategoryRoutes(subcategoryScope, {
        prismaRepository: deps.prismaRepository,
      });
    },
    { prefix: "/api/subcategory" }
  );

  app.register(
    async function (tagsScope) {
      tagsRoutes(tagsScope, {
        prismaRepository: deps.prismaRepository,
      });
    },
    { prefix: "/api/tags" }
  );

  app.register(
    async function (likedScope) {
      likedRoutes(likedScope, {
        prismaRepository: deps.prismaRepository,
      });
    },
    { prefix: "/api/liked" }
  );

  app.register(
    async function (thoughtScope) {
      thoughtRoutes(thoughtScope, {
        prismaRepository: deps.prismaRepository,
        postQueue: deps.postQueue,
      });
    },
    { prefix: "/api/thought" }
  );

  app.register(
    async function (playlistScope) {
      playlistRoutes(playlistScope, {
        prismaRepository: deps.prismaRepository,
        postQueue: deps.postQueue,
      });
    },
    { prefix: "/api/playlist" }
  );

  app.register(
    async function (privacyPolicyScope) {
      policyRoutes(privacyPolicyScope, {
        prismaRepository: deps.prismaRepository,
        postQueue: deps.postQueue,
      });
    },
    { prefix: "/api/privacy-policy" }
  );
}
