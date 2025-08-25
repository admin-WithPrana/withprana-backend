import { setupRoutes } from './userRoutes.js';
import { adminRoutes } from './adminRoutes.js';
import { authRoutes } from './authRoutes.js';
import { categoryRoutes } from './categoryRoutes.js';
import { meditationRoutes } from "./meditationRoutes.js";
import { subcategoryRoutes } from './subCategoryRoutes.js';
import { tagsRoutes } from './tagRoutes.js';


export async function registerRoutes(app, deps) {
  app.register(async function (userScope) {
    setupRoutes(userScope, {
      prismaRepository: deps.prismaRepository,
      mailer: deps.mailer
    });
  }, { prefix: '/api/user' });

  app.register(async function (adminScope) {
    adminRoutes(adminScope, {
      prismaRepository: deps.prismaRepository,
    });
  }, { prefix: '/api/admin' });

  app.register(async function (authScope) {
    authRoutes(authScope, {
      prismaRepository: deps.prismaRepository,
      mailer: deps.mailerd
    });
  }, { prefix: '/api/auth' });

  app.register(async function (category) {
    categoryRoutes(category, {
      prismaRepository: deps.prismaRepository
    });
  }, { prefix: '/api/category' });

  app.register(async function (meditation) {
    meditationRoutes(meditation, {
      prismaRepository: deps.prismaRepository,
      mongoRepository: deps.mongoRepository
    });
  }, { prefix: '/api/meditation' });

  app.register(async function (category) {
    subcategoryRoutes(category, {
      prismaRepository: deps.prismaRepository
    });
  }, { prefix: '/api/subcategory' });

    app.register(async function (tags) {
    tagsRoutes(tags, {
      prismaRepository: deps.prismaRepository
    });
  }, { prefix: '/api/tags' });
}