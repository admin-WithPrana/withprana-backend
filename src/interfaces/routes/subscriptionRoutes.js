import { SubscriptionController } from '../controllers/subscriptionController.js';
import { SubscriptionUseCases } from '../../domain/usecases/subscriptionUseCases.js';
import { SubscriptionRepository } from '../../infrastructure/databases/postgres/SubscriptionRepository.js';
import { StripeService } from '../../infrastructure/services/stripeService.js';
import { authMiddleware } from '../../infrastructure/services/middleware.js';

export const setupSubscriptionRoutes = (app, { prismaRepository, userRepository }) => {
  const subscriptionRepo = new SubscriptionRepository(prismaRepository.prisma);
  const stripeService = new StripeService();
  
  const subscriptionUseCases = new SubscriptionUseCases(
    subscriptionRepo,
    userRepository,
    stripeService
  );
  
  const subscriptionController = new SubscriptionController(subscriptionUseCases);

  app.post('/webhook', {
    config: {
      rawBody: true,
    },
    handler: (request, reply) => subscriptionController.handleWebhook(request, reply)
  });

  app.get('/plans', (request, reply) => 
    subscriptionController.getPlans(request, reply)
  );

  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authMiddleware);

    protectedApp.post('/checkout', (request, reply) => 
      subscriptionController.createCheckoutSession(request, reply)
    );

    protectedApp.get('/status', (request, reply) => 
      subscriptionController.getSubscriptionStatus(request, reply)
    );

    protectedApp.post('/cancel', (request, reply) => 
      subscriptionController.cancelSubscription(request, reply)
    );

    protectedApp.get('/transactions', (request, reply) => 
      subscriptionController.getTransactionHistory(request, reply)
    );

    protectedApp.get('/validate-premium', (request, reply) => 
      subscriptionController.validatePremiumAccess(request, reply)
    );
  });

  app.register(async (adminApp) => {
    adminApp.addHook('onRequest', authMiddleware);

    adminApp.post('/admin/plans', (request, reply) => 
      subscriptionController.createPlan(request, reply)
    );

    adminApp.put('/admin/plans/:planId', (request, reply) => 
      subscriptionController.updatePlan(request, reply)
    );

    adminApp.patch('/admin/plans/:planId/visibility', (request, reply) => 
      subscriptionController.togglePlanVisibility(request, reply)
    );

    adminApp.get('/admin/subscriptions', (request, reply) => 
      subscriptionController.getSubscriptions(request, reply)
    );

    adminApp.get('/admin/subscriptions/:subscriptionId', (request, reply) => 
      subscriptionController.getSubscriptionById(request, reply)
    );

    adminApp.post('/admin/subscriptions/:subscriptionId/cancel', (request, reply) => 
      subscriptionController.adminCancelSubscription(request, reply)
    );

    adminApp.get('/admin/transactions', (request, reply) => 
      subscriptionController.getAdminTransactions(request, reply)
    );
  });
};