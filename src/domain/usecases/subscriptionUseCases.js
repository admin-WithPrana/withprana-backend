export class SubscriptionUseCases {
  constructor(subscriptionRepository, userRepository, stripeService) {
    this.subscriptionRepo = subscriptionRepository;
    this.userRepo = userRepository;
    this.stripeService = stripeService;
  }

  async createSubscriptionCheckout(userId, planId) {
    try {
      console.log(this.userRepo)
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription) {
        throw new Error('User already has an active subscription');
      }

      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user);
        stripeCustomerId = customer.id;
        await this.subscriptionRepo.updateUserStripeCustomerId(userId, stripeCustomerId);
      }

      const subscription = await this.stripeService.createSubscription(
        stripeCustomerId,
        plan.stripePriceId
      );

      const dbSubscription = await this.subscriptionRepo.createSubscription({
        userId,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: 'ACTIVE',
      });

      // Update user subscription type
      await this.userRepo.update(userId, {
        subscriptionType: 'premium',
      });

      return {
        subscriptionId: dbSubscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        stripeSubscriptionId: subscription.id,
      };
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      throw new Error(`Webhook handling failed: ${error.message}`);
    }
  }

  async handleInvoicePaymentSucceeded(invoice) {
    const subscription = await this.subscriptionRepo.findSubscriptionByStripeId(invoice.subscription);
    
    if (subscription) {
      // Update subscription period
      await this.subscriptionRepo.updateSubscription(subscription.id, {
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        status: 'ACTIVE',
      });

      // Create transaction record
      await this.subscriptionRepo.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        amount: invoice.amount_paid / 100,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        status: 'SUCCEEDED',
        type: 'SUBSCRIPTION',
      });
    }
  }

  async handleInvoicePaymentFailed(invoice) {
    const subscription = await this.subscriptionRepo.findSubscriptionByStripeId(invoice.subscription);
    
    if (subscription) {
      await this.subscriptionRepo.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        amount: invoice.amount_due / 100,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        status: 'FAILED',
        type: 'SUBSCRIPTION',
      });

      // Optionally downgrade user after multiple failed payments
      await this.checkAndHandleFailedPayments(subscription.userId);
    }
  }

  async handleSubscriptionUpdated(stripeSubscription) {
    const subscription = await this.subscriptionRepo.findSubscriptionByStripeId(stripeSubscription.id);
    
    if (subscription) {
      await this.subscriptionRepo.updateSubscription(subscription.id, {
        status: stripeSubscription.status.toUpperCase(),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      });

      // If subscription is no longer active, downgrade user
      if (!['active', 'trialing'].includes(stripeSubscription.status)) {
        await this.userRepo.update(subscription.userId, {
          subscriptionType: 'free',
        });
      }
    }
  }

  async handleSubscriptionDeleted(stripeSubscription) {
    const subscription = await this.subscriptionRepo.findSubscriptionByStripeId(stripeSubscription.id);
    
    if (subscription) {
      await this.subscriptionRepo.updateSubscription(subscription.id, {
        status: 'CANCELED',
      });

      // Downgrade user to free
      await this.userRepo.update(subscription.userId, {
        subscriptionType: 'free',
      });
    }
  }

  async checkAndHandleFailedPayments(userId) {
    // Implement logic to handle multiple failed payments
    // This could involve downgrading the user after a certain number of failures
    const recentFailedTransactions = await this.subscriptionRepo.getUserTransactions(userId, {
      status: 'FAILED',
      limit: 3, // Check last 3 transactions
    });

    if (recentFailedTransactions.transactions.length >= 3) {
      // Cancel subscription and downgrade user
      const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription) {
        await this.stripeService.cancelSubscription(activeSubscription.stripeSubscriptionId);
        await this.userRepo.update(userId, { subscriptionType: 'free' });
      }
    }
  }

  async cancelSubscription(userId) {
    const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
    
    if (!activeSubscription) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    await this.stripeService.cancelSubscription(activeSubscription.stripeSubscriptionId);

    // Update in database
    await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
    });

    return { message: 'Subscription cancelled successfully' };
  }

  async getUserSubscriptionStatus(userId) {
    const userWithSubscription = await this.subscriptionRepo.getUserWithSubscription(userId);
    
    if (!userWithSubscription) {
      throw new Error('User not found');
    }

    const activeSubscription = userWithSubscription.subscriptions[0];
    const isPremium = activeSubscription && 
                     activeSubscription.status === 'ACTIVE' && 
                     new Date() < activeSubscription.currentPeriodEnd;

    return {
      subscriptionType: userWithSubscription.subscriptionType,
      isPremium,
      activeSubscription: isPremium ? activeSubscription : null,
      hasAccessToPremium: isPremium,
    };
  }

  async getTransactionHistory(userId, filters) {
    return await this.subscriptionRepo.getUserTransactions(userId, filters);
  }

  async getSubscriptionPlans() {
    return await this.subscriptionRepo.getAllSubscriptionPlans();
  }

  async validatePremiumAccess(userId) {
    const status = await this.getUserSubscriptionStatus(userId);
    
    if (!status.hasAccessToPremium) {
      throw new Error('Premium subscription required to access this content');
    }
    
    return true;
  }
  
  async createPlan(planData) {
    try {
      const { name, price, interval, intervalCount = 1, trialDays, currency = 'usd' } = planData;

      // Validate required fields
      if (!name || !price || !interval) {
        throw new Error('Name, price, and interval are required');
      }

      // Create price in Stripe
      const stripePrice = await this.stripeService.stripe.prices.create({
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval.toLowerCase(),
          interval_count: intervalCount,
        },
        product_data: {
          name: name,
          metadata: {
            type: 'subscription'
          }
        },
      });

      // Create plan in database
      const plan = await this.subscriptionRepo.createPlan({
        name,
        price,
        currency,
        interval: interval.toLowerCase(),
        intervalCount,
        trialDays,
        stripePriceId: stripePrice.id,
        visible: true,
      });

      return plan;
    } catch (error) {
      throw new Error(`Failed to create subscription plan: ${error.message}`);
    }
  }

  // Admin: Update subscription plan
  async updatePlan(planId, planData) {
    try {
      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Don't allow updating Stripe price ID
      const { stripePriceId, ...updateData } = planData;

      const updatedPlan = await this.subscriptionRepo.updatePlan(planId, updateData);
      return updatedPlan;
    } catch (error) {
      throw new Error(`Failed to update subscription plan: ${error.message}`);
    }
  }

  // Admin: Toggle plan visibility
  async togglePlanVisibility(planId) {
    try {
      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const updatedPlan = await this.subscriptionRepo.updatePlan(planId, {
        visible: !plan.visible
      });

      return updatedPlan;
    } catch (error) {
      throw new Error(`Failed to toggle plan visibility: ${error.message}`);
    }
  }

  // Admin: Get all subscriptions with pagination and filters
  async getSubscriptions(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        userId,
        planId,
        search
      } = filters;

      const result = await this.subscriptionRepo.getSubscriptions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        userId: userId ? BigInt(userId) : undefined,
        planId,
        search
      });

      return result;
    } catch (error) {
      console.error(error)
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  // Admin: Get subscription by ID
  async getSubscriptionById(subscriptionId) {
    try {
      const subscription = await this.subscriptionRepo.findSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return subscription;
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  // Admin: Cancel subscription
  async adminCancelSubscription(subscriptionId) {
    try {
      const subscription = await this.subscriptionRepo.findSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      }

      // Update in database
      const updatedSubscription = await this.subscriptionRepo.updateSubscription(subscriptionId, {
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
      });

      // Downgrade user
      await this.userRepo.update(subscription.userId, {
        subscriptionType: 'free',
      });

      return updatedSubscription;
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Admin: Get all transactions with pagination
  async getAdminTransactions(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        userId,
        subscriptionId
      } = filters;

      const result = await this.subscriptionRepo.getAdminTransactions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        userId: userId ? BigInt(userId) : undefined,
        subscriptionId
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }
}