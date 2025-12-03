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

      // Create or get valid Stripe customer
      const customer = await this.stripeService.createOrGetCustomer(user);
      
      // Update user with valid Stripe customer ID
      if (user.stripeCustomerId !== customer.id) {
        await this.subscriptionRepo.updateUserStripeCustomerId(userId, customer.id);
      }

      // Create ONE-TIME payment session (not subscription)
      const session = await this.stripeService.stripe.checkout.sessions.create({
        customer: customer.id,
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
          stripeCustomerId: customer.id,
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
      console.error('Error in createSubscriptionCheckout:', error);
      throw new Error(`Failed to create payment session: ${error.message}`);
    }
  }

async createAppSubscriptionCheckout(userId, planId) {
  try {
    console.log('Starting app checkout for user:', userId);
    
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const plan = await this.subscriptionRepo.findPlanById(planId);
    if (!plan) throw new Error('Invalid subscription plan');

    // Check for active subscription
    const activeSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
    if (activeSubscription) throw new Error('User already has an active subscription');

    // Create or get valid Stripe customer
    const customer = await this.stripeService.createOrGetCustomer(user);
    
    // ✅ UPDATE CUSTOMER WITH REQUIRED DETAILS FOR INDIAN EXPORTS
    console.log('🔄 Updating customer with required billing details for Indian exports...');
    
    const updatedCustomer = await this.stripeService.stripe.customers.update(customer.id, {
      name: user.name || 'Customer', // REQUIRED: Customer name
      address: {
        line1: '123 Main Street',    // REQUIRED: Address line 1
        city: 'Mumbai',              // REQUIRED: City
        state: 'Maharashtra',        // REQUIRED: State
        postal_code: '400001',       // REQUIRED: Postal code
        country: 'IN'                // REQUIRED: Country
      },
      // Also ensure email is set if not already
      email: user.email
    });
    
    console.log('✅ Customer updated with billing details:', {
      name: updatedCustomer.name,
      address: updatedCustomer.address
    });

    // Update user with valid Stripe customer ID if changed
    if (user.stripeCustomerId !== customer.id) {
      await this.subscriptionRepo.updateUserStripeCustomerId(userId, customer.id);
      console.log('Updated user with new Stripe customer ID:', customer.id);
    }

    // Create proper description for Indian regulations
    const description = `Meditation App Subscription: ${plan.name} - ${plan.intervalCount} ${plan.interval}(s) access`;
    const statementDescriptor = `MEDITATION${plan.name.substring(0, 8).toUpperCase().replace(/\s+/g, '')}`;
    
    console.log('Creating payment intent with:');
    console.log('- Description:', description);
    console.log('- Statement Descriptor:', statementDescriptor);

    // Create payment intent with ALL required fields for Indian regulations
    const paymentIntent = await this.stripeService.stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100), // Convert to cents
      currency: plan.currency.toLowerCase(),
      customer: customer.id,
      payment_method_types: ['card'],
      description: description, // REQUIRED for Indian exports
      statement_descriptor: statementDescriptor, // Shows on bank statement
      statement_descriptor_suffix: 'SUBSCRIPTION', // Additional identifier
      metadata: {
        userId: userId.toString(),
        planId: plan.id,
        type: 'SUBSCRIPTION_PAYMENT',
        planName: plan.name,
        planInterval: plan.interval,
        productType: 'digital_subscription'
      }
    });

    console.log('✅ Payment intent created:', paymentIntent.id);
    console.log('✅ Payment intent description:', paymentIntent.description);
    console.log('✅ Payment intent statement descriptor:', paymentIntent.statement_descriptor);

    // Create pending transaction in DB
    await this.subscriptionRepo.createTransaction({
      userId,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'PENDING',
      type: 'SUBSCRIPTION',
      stripePaymentIntentId: paymentIntent.id,
      metadata: {
        planName: plan.name,
        stripeCustomerId: customer.id,
        planInterval: plan.interval,
        planIntervalCount: plan.intervalCount,
        description: description,
        statementDescriptor: statementDescriptor,
        paymentIntentCreated: new Date().toISOString(),
        customerName: updatedCustomer.name,
        customerAddress: updatedCustomer.address
      }
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      description: paymentIntent.description,
      message: 'Payment initiated successfully for mobile'
    };

  } catch (error) {
    console.error('❌ Error in createAppSubscriptionCheckout:', error);
    
    if (error.code === 'parameter_invalid_empty' && error.param === 'description') {
      throw new Error('Payment description is required for regulatory compliance. Please contact support.');
    }
    
    if (error.message.includes('Indian regulations') || error.message.includes('description')) {
      throw new Error('Payment requires proper description for regulatory compliance. Please try again or contact support.');
    }
    
    if (error.message.includes('customer name and address')) {
      throw new Error('Customer name and address are required for international payments. Please update your profile.');
    }
    
    throw new Error(`Failed to create mobile payment: ${error.message}`);
  }
}

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

      const existingSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(BigInt(userId));
      if (existingSubscription) {
        console.log('Subscription already exists for user:', userId);
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

      const now = new Date();
      let currentPeriodEnd = new Date();
      
      if (plan.interval === 'month') {
        currentPeriodEnd.setMonth(now.getMonth() + (plan.intervalCount || 1));
      } else if (plan.interval === 'year') {
        currentPeriodEnd.setFullYear(now.getFullYear() + (plan.intervalCount || 1));
      } else {
        currentPeriodEnd.setMonth(now.getMonth() + 1);
      }

      const subscription = await this.subscriptionRepo.createSubscription({
        userId: BigInt(userId),
        planId: planId,
        stripeSubscriptionId: null,
        stripeCustomerId: session.customer,
        currentPeriodStart: now,
        currentPeriodEnd: currentPeriodEnd,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
      });

      await this.userRepo.updateUserSubscriptionType(BigInt(userId), 'premium');

      await this.subscriptionRepo.updateTransactionByCheckoutSession(session.id, {
        status: 'SUCCEEDED',
        subscriptionId: subscription.id,
        stripePaymentIntentId: session.payment_intent,
      });

      console.log(`Subscription created for user ${userId} via webhook`);

    } catch (error) {
      console.error('Error handling checkout session completed:', error);
      await this.subscriptionRepo.updateTransactionByCheckoutSession(session.id, {
        status: 'FAILED',
      });
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      console.log('Processing payment intent succeeded:', this.userRepo);

      const transaction = await this.subscriptionRepo.findTransactionByStripePaymentIntent(paymentIntent.id);
      
      if (!transaction) {
        console.warn('No transaction found for payment intent:', paymentIntent.id);
        return;
      }

      if (transaction.status === 'SUCCEEDED') {
        return;
      }
      const existingSubscription = await this.subscriptionRepo.findActiveSubscriptionByUserId(transaction.userId);
      
      if (!existingSubscription) {
        const plan = await this.subscriptionRepo.findPlanById(transaction.planId);
        if (!plan) {
          throw new Error(`Plan not found: ${transaction.planId}`);
        }

        const now = new Date();
        let currentPeriodEnd = new Date();
        
        if (plan.interval === 'month') {
          currentPeriodEnd.setMonth(now.getMonth() + (plan.intervalCount || 1));
        } else if (plan.interval === 'year') {
          currentPeriodEnd.setFullYear(now.getFullYear() + (plan.intervalCount || 1));
        } else {
          currentPeriodEnd.setMonth(now.getMonth() + 1);
        }

        const subscription = await this.subscriptionRepo.createSubscription({
          userId: transaction.userId,
          planId: transaction.planId,
          stripeSubscriptionId: null,
          stripeCustomerId: paymentIntent.customer,
          currentPeriodStart: now,
          currentPeriodEnd: currentPeriodEnd,
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
        });

        await this.userRepo.updateUserSubscriptionType(transaction.userId, 'premium');

        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: 'SUCCEEDED',
          subscriptionId: subscription.id,
        });

        console.log(`Subscription created for user ${transaction.userId} via payment intent webhook`);
      } else {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: 'SUCCEEDED',
        });
        console.log(`Payment succeeded for existing subscription user: ${transaction.userId}`);
      }

    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
      const transaction = await this.subscriptionRepo.findTransactionByStripePaymentIntent(paymentIntent.id);
      if (transaction) {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: 'FAILED',
        });
      }
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    try {
      console.log('Processing payment intent failed:', paymentIntent.id);
      
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

    await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
    });

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

  // Admin methods
  async createPlan(planData) {
    try {
      const { name, price, interval, intervalCount = 1, trialDays, currency = 'usd' } = planData;

      if (!name || !price || !interval) {
        throw new Error('Name, price, and interval are required');
      }

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