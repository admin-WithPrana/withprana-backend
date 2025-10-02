export class SubscriptionUseCases {
  constructor(subscriptionRepository, userRepository, stripeService) {
    this.subscriptionRepo = subscriptionRepository;
    this.userRepo = userRepository;
    this.stripeService = stripeService;
  }

  async createSubscriptionCheckout(userId, planId) {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      // Check for active subscription
      const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription) {
        throw new Error('User already has an active subscription');
      }

      let stripeCustomerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await this.stripeService.stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: userId.toString()
          }
        });
        stripeCustomerId = customer.id;
        await this.subscriptionRepo.updateUserStripeCustomerId(userId, stripeCustomerId);
      }

      // Create ONE-TIME payment session (not subscription)
      const session = await this.stripeService.stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: plan.name,
                description: `${plan.intervalCount} ${plan.interval}(s) subscription`
              },
              unit_amount: Math.round(plan.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment', // One-time payment, NOT subscription
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: userId.toString(),
          planId: plan.id,
          type: 'SUBSCRIPTION_PAYMENT'
        },
      });

      // Create pending transaction
      await this.subscriptionRepo.createTransaction({
        userId,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'PENDING',
        type: 'SUBSCRIPTION',
        stripePaymentIntentId: session.payment_intent || null,
        metadata: {
          checkoutSessionId: session.id,
          planName: plan.name,
          stripeCustomerId: stripeCustomerId,
          planInterval: plan.interval,
          planIntervalCount: plan.intervalCount
        }
      });

      return {
        success: true,
        sessionId: session.id,
        paymentUrl: session.url,
        message: 'Payment session created successfully'
      };
    } catch (error) {
      console.error(error)
      throw new Error(`Failed to create payment session: ${error.message}`);
    }
  }

  async createAppSubscriptionCheckout(userId, planId) {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new Error('User not found');
  
      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) throw new Error('Invalid subscription plan');

      console.log(plan,"plan")
  
      // Check for active subscription
      const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription) throw new Error('User already has an active subscription');
  
      let stripeCustomerId = user.stripeCustomerId;
  
      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await this.stripeService.stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: userId.toString() }
        });
        stripeCustomerId = customer.id;
        await this.subscriptionRepo.updateUserStripeCustomerId(userId, stripeCustomerId);
      }
  
      // Create PaymentIntent for mobile
      const paymentIntent = await this.stripeService.stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100), // Convert to cents
        currency: plan.currency.toLowerCase(),
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: {
          userId: userId.toString(),
          planId: plan?.id,
          type: 'SUBSCRIPTION_PAYMENT'
        }
      });

      // Create pending transaction in DB
      await this.subscriptionRepo.createTransaction({
        userId,
        planId: plan?.id,
        amount: plan?.price,
        currency: plan?.currency,
        status: 'PENDING',
        type: 'SUBSCRIPTION',
        stripePaymentIntentId: paymentIntent?.id,
        metadata: {
          planName: plan?.name,
          stripeCustomerId: stripeCustomerId,
          planInterval: plan?.interval,
          planIntervalCount: plan?.intervalCount
        }
      });
  
      return {
        success: true,
        clientSecret: paymentIntent?.client_secret,
        message: 'Payment initiated successfully for mobile'
      };
  
    } catch (error) {
      console.error(error)
      throw new Error(`Failed to create mobile payment: ${error.message}`);
    }
  }
  

  // async handleWebhookEvent(payload, signature) {
  //   try {
  //     console.log(payload, signature)
  //     const event = this.stripeService.constructEvent(
  //       payload,
  //       signature,
  //       process.env.STRIPE_WEBHOOK_SECRET
  //     );

  //     console.log(`Received webhook event: ${event.type}`);

  //     switch (event.type) {
  //       case 'checkout.session.completed':
  //         await this.handleCheckoutSessionCompleted(event.data.object);
  //         break;
        
  //       case 'checkout.session.async_payment_succeeded':
  //         await this.handleCheckoutSessionCompleted(event.data.object);
  //         break;
        
  //       case 'payment_intent.succeeded':
  //         await this.handlePaymentIntentSucceeded(event.data.object);
  //         break;
        
  //       case 'payment_intent.payment_failed':
  //         await this.handlePaymentIntentFailed(event.data.object);
  //         break;
        
  //       default:
  //         console.log(`Unhandled event type: ${event.type}`);
  //     }
  //   } catch (error) {
  //     console.error('Webhook error:', error);
  //     throw new Error(`Webhook handling failed: ${error.message}`);
  //   }
  // }
  async handleWebhookEvent(event) {
    try {
      console.log(`Received webhook event: ${event.type}`);
  
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
  
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
  
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
  
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error(`Webhook handling failed: ${error.message}`);
    }
  }
  

  async handleCheckoutSessionCompleted(session) {
    try {
      const { userId, planId, type } = session.metadata;
      
      if (!userId || !planId || type !== 'SUBSCRIPTION_PAYMENT') {
        console.warn('Invalid metadata in checkout session:', session.id);
        return;
      }

      // Check if subscription already exists to prevent duplicates
      const existingSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(BigInt(userId));
      if (existingSubscription) {
        console.log('Subscription already exists for user:', userId);
        // Still update transaction status
        await this.subscriptionRepo.updateTransactionByCheckoutSession(session.id, {
          status: 'SUCCEEDED',
          stripePaymentIntentId: session.payment_intent,
        });
        return;
      }

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Calculate subscription period based on plan
      const now = new Date();
      let currentPeriodEnd = new Date();
      
      if (plan.interval === 'month') {
        currentPeriodEnd.setMonth(now.getMonth() + (plan.intervalCount || 1));
      } else if (plan.interval === 'year') {
        currentPeriodEnd.setFullYear(now.getFullYear() + (plan.intervalCount || 1));
      } else {
        // Default to 1 month
        currentPeriodEnd.setMonth(now.getMonth() + 1);
      }

      // Create subscription in database (INTERNAL subscription management)
      const subscription = await this.subscriptionRepo.createSubscription({
        userId: BigInt(userId),
        planId: planId,
        stripeSubscriptionId: null, // We're not using Stripe subscriptions
        stripeCustomerId: session.customer,
        currentPeriodStart: now,
        currentPeriodEnd: currentPeriodEnd,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
      });

      // Update user subscription type
      await this.userRepo.updateUserSubscriptionType(BigInt(userId), 'premium');

      // Update transaction status
      await this.subscriptionRepo.updateTransactionByCheckoutSession(session.id, {
        status: 'SUCCEEDED',
        subscriptionId: subscription.id,
        stripePaymentIntentId: session.payment_intent,
      });

      console.log(`Subscription created for user ${userId} via webhook`);

    } catch (error) {
      console.error('Error handling checkout session completed:', error);
      // Still update transaction to failed status
      await this.subscriptionRepo.updateTransactionByCheckoutSession(session.id, {
        status: 'FAILED',
      });
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      // Find transaction by payment intent
      const transaction = await this.subscriptionRepo.findTransactionByStripePaymentIntent(paymentIntent.id);
      
      if (!transaction) {
        console.warn('No transaction found for payment intent:', paymentIntent.id);
        return;
      }

      // If transaction is already processed, skip
      if (transaction.status === 'SUCCEEDED') {
        return;
      }

      // Update transaction status
      await this.subscriptionRepo.updateTransaction(transaction.id, {
        status: 'SUCCEEDED',
      });

      console.log(`Payment succeeded for transaction: ${transaction.id}`);

    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    try {
      const transaction = await this.subscriptionRepo.findTransactionByStripePaymentIntent(paymentIntent.id);
      
      if (transaction) {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: 'FAILED',
        });
        console.log(`Payment failed for transaction: ${transaction.id}`);
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error);
    }
  }

  async cancelSubscription(userId) {
    const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
    
    if (!activeSubscription) {
      throw new Error('No active subscription found');
    }

    // Update in database (INTERNAL cancellation)
    await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
    });

    // Downgrade user
    await this.userRepo.updateUserSubscriptionType(userId, 'free');

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

  // Admin methods remain the same...
  async createPlan(planData) {
    try {
      const { name, price, interval, intervalCount = 1, trialDays, currency = 'usd' } = planData;

      if (!name || !price || !interval) {
        throw new Error('Name, price, and interval are required');
      }

      // Create plan in database only (no Stripe price creation)
      const plan = await this.subscriptionRepo.createPlan({
        name,
        price,
        currency,
        interval: interval.toLowerCase(),
        intervalCount,
        trialDays,
        stripePriceId: null, // We're not using Stripe prices
        visible: true,
      });

      return plan;
    } catch (error) {
      throw new Error(`Failed to create subscription plan: ${error.message}`);
    }
  }

  async updatePlan(planId, planData) {
    try {
      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const updatedPlan = await this.subscriptionRepo.updatePlan(planId, planData);
      return updatedPlan;
    } catch (error) {
      throw new Error(`Failed to update subscription plan: ${error.message}`);
    }
  }

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

  async adminCancelSubscription(subscriptionId) {
    try {
      const subscription = await this.subscriptionRepo.findSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Update in database only (internal cancellation)
      const updatedSubscription = await this.subscriptionRepo.updateSubscription(subscriptionId, {
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
      });

      // Downgrade user
      await this.userRepo.updateUserSubscriptionType(subscription.userId, 'free');

      return updatedSubscription;
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

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