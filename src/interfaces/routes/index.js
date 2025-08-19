// interfaces/routes/index.js
import { setupRoutes } from './userRoutes.js';
import { adminRoutes } from './adminRoutes.js';
import { authRoutes } from './authRoutes.js';
import { categoryRoutes } from './categoryRoutes.js';
import {meditatioRoutes} from "./meditationRoutes.js"

export async function registerRoutes(app, deps) {
  app.register(async function (userScope) {
    setupRoutes(userScope, deps);
  }, { prefix: '/api/user' });

  app.register(async function (adminScope) {
    adminRoutes(adminScope, deps);
  }, { prefix: '/api/admin' });

  app.register(async function (authScope) {
    authRoutes(authScope, deps);
  }, { prefix: '/api/auth' });

  app.register(async function (category) {
    categoryRoutes(category, deps);
  }, { prefix: '/api/category' });

  app.register(async function (meditation) {
    meditatioRoutes(meditation, deps);
  }, { prefix: '/api/meditation' });
}