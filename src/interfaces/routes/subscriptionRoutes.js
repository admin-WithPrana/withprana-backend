import { SubscriptionController } from '../controllers/subscriptionController.js';
import { SubscriptionUseCases } from '../../domain/usecases/subscriptionUseCases.js';
import { SubscriptionRepository } from '../../infrastructure/databases/postgres/SubscriptionRepository.js';
import { StripeService } from '../../infrastructure/services/stripeService.js';
import { authMiddleware } from '../../infrastructure/services/middleware.js';
import stripe from 'stripe';

export const setupSubscriptionRoutes = (app, { prismaRepository, userRepository }) => {
  const subscriptionRepo = new SubscriptionRepository(prismaRepository.prisma);
  const stripeService = new StripeService();
  const subscriptionUseCases = new SubscriptionUseCases(
    subscriptionRepo,
    userRepository,
    stripeService
  );
  const subscriptionController = new SubscriptionController(subscriptionUseCases);

  // ---- Stripe webhook route with manual stream parsing ----
  app.post('/webhook', {
    config: {
      rawBody: true
    },
    bodyParser: false // Completely disable body parsing for this route
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    
    // Validate Stripe signature header
    if (!sig) {
      console.error('❌ Missing Stripe signature header');
      return reply.code(400).send('Missing Stripe signature');
    }

    let rawBody;
    try {
      // Manually read the raw body from the stream
      const chunks = [];
      for await (const chunk of request.raw) {
        chunks.push(chunk);
      }
      rawBody = Buffer.concat(chunks);
    } catch (error) {
      console.error('❌ Error reading request body:', error);
      return reply.code(400).send('Error reading webhook payload');
    }

    if (!rawBody || rawBody.length === 0) {
      console.error('❌ No webhook payload was provided');
      return reply.code(400).send('No webhook payload was provided');
    }

    console.log(`📨 Webhook received: ${rawBody.length} bytes, signature: ${sig.substring(0, 20)}...`);

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      console.error('Payload preview:', rawBody.toString().substring(0, 200));
      console.error('Signature:', sig);
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Received webhook event:', event.type);

    try {
      // Pass full event to your controller
      await subscriptionController.handleWebhook(event);
      console.log(`✅ Successfully processed webhook: ${event.type}`);
    } catch (err) {
      console.error('❌ Error handling webhook:', err);
      return reply.code(500).send('Internal Server Error');
    }

    reply.send({ received: true });
  });

  // ---- Normal routes (JSON parsing) ----
  app.get('/plans', (request, reply) => subscriptionController.getPlans(request, reply));

  // Protected routes (require authentication)
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authMiddleware);
    
    protectedApp.post('/web-checkout', (req, res) => subscriptionController.createCheckoutSession(req, res));
    protectedApp.post('/app-checkout', (req, res) => subscriptionController.createAppCheckoutSession(req, res));
    protectedApp.get('/status', (req, res) => subscriptionController.getSubscriptionStatus(req, res));
    protectedApp.post('/cancel', (req, res) => subscriptionController.cancelSubscription(req, res));
    protectedApp.get('/transactions', (req, res) => subscriptionController.getTransactionHistory(req, res));
    protectedApp.get('/validate-premium', (req, res) => subscriptionController.validatePremiumAccess(req, res));
  });

  // Admin routes (require authentication + admin privileges)
  app.register(async (adminApp) => {
    adminApp.addHook('onRequest', authMiddleware);
    
    adminApp.post('/admin/plans', (req, res) => subscriptionController.createPlan(req, res));
    adminApp.put('/admin/plans/:planId', (req, res) => subscriptionController.updatePlan(req, res));
    adminApp.patch('/admin/plans/:planId/visibility', (req, res) => subscriptionController.togglePlanVisibility(req, res));
    adminApp.get('/admin/subscriptions', (req, res) => subscriptionController.getSubscriptions(req, res));
    adminApp.get('/admin/subscriptions/:subscriptionId', (req, res) => subscriptionController.getSubscriptionById(req, res));
    adminApp.post('/admin/subscriptions/:subscriptionId/cancel', (req, res) => subscriptionController.adminCancelSubscription(req, res));
    adminApp.get('/admin/transactions', (req, res) => subscriptionController.getAdminTransactions(req, res));
  });
};