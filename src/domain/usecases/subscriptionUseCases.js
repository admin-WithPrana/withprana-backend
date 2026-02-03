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
        throw new Error("User not found");
      }

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error("Invalid subscription plan");
      }

      // Check for active subscription
      const activeSubscription =
        await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription) {
        throw new Error("User already has an active subscription");
      }

      // Create or get valid Stripe customer
      const customer = await this.stripeService.createOrGetCustomer(user);

      // Update user with valid Stripe customer ID
      if (user.stripeCustomerId !== customer.id) {
        await this.subscriptionRepo.updateUserStripeCustomerId(
          userId,
          customer.id,
        );
      }

      // Create SUBSCRIPTION session
      // Use plan.trialDays if defined, otherwise default to 7.
      // Use ?? so that 0 is respected (no trial).
      const trialDays = plan.trialDays ?? 7;

      const sessionConfig = {
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: plan.name,
                description: `${plan.intervalCount} ${plan.interval}(s) subscription`,
              },
              unit_amount: Math.round(plan.price * 100), // Convert to cents
              recurring: {
                interval: plan.interval,
                interval_count: plan.intervalCount,
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            planId: plan.id,
          },
        },
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: userId.toString(),
          planId: plan.id,
          type: "SUBSCRIPTION_PAYMENT",
        },
      };

      if (trialDays > 0) {
        sessionConfig.subscription_data.trial_period_days = trialDays;
      }

      const session =
        await this.stripeService.stripe.checkout.sessions.create(sessionConfig);

      // Create pending transaction
      await this.subscriptionRepo.createTransaction({
        userId,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: "PENDING",
        type: "SUBSCRIPTION",
        stripePaymentIntentId: session.payment_intent || null,
        metadata: {
          checkoutSessionId: session.id,
          planName: plan.name,
          stripeCustomerId: customer.id,
          planInterval: plan.interval,
          planIntervalCount: plan.intervalCount,
        },
      });

      return {
        success: true,
        sessionId: session.id,
        paymentUrl: session.url,
        message: "Payment session created successfully",
      };
    } catch (error) {
      console.error("Error in createSubscriptionCheckout:", error);
      throw new Error(`Failed to create payment session: ${error.message}`);
    }
  }

  async createAppSubscriptionCheckout(userId, planId) {
    try {
      console.log("Starting app checkout for user:", userId);

      const user = await this.userRepo.findById(userId);
      if (!user) throw new Error("User not found");

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) throw new Error("Invalid subscription plan");

      // Check for active subscription
      const activeSubscription =
        await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      if (activeSubscription)
        throw new Error("User already has an active subscription");

      // Create or get valid Stripe customer
      const customer = await this.stripeService.createOrGetCustomer(user);

      // ✅ UPDATE CUSTOMER WITH REQUIRED DETAILS FOR INDIAN EXPORTS
      console.log(
        "🔄 Updating customer with required billing details for Indian exports...",
      );

      const updatedCustomer = await this.stripeService.stripe.customers.update(
        customer.id,
        {
          name: user.name || "Customer", // REQUIRED: Customer name
          address: {
            line1: "123 Main Street", // REQUIRED: Address line 1
            city: "Mumbai", // REQUIRED: City
            state: "Maharashtra", // REQUIRED: State
            postal_code: "400001", // REQUIRED: Postal code
            country: "IN", // REQUIRED: Country
          },
          // Also ensure email is set if not already
          email: user.email,
        },
      );

      console.log("✅ Customer updated with billing details:", {
        name: updatedCustomer.name,
        address: updatedCustomer.address,
      });

      // Update user with valid Stripe customer ID if changed
      if (user.stripeCustomerId !== customer.id) {
        await this.subscriptionRepo.updateUserStripeCustomerId(
          userId,
          customer.id,
        );
        console.log("Updated user with new Stripe customer ID:", customer.id);
      }

      // Create proper description for Indian regulations
      const description = `Meditation App Subscription: ${plan.name} - ${plan.intervalCount} ${plan.interval}(s) access`;

      // Create SUBSCRIPTION instead of PaymentIntent
      const trialDays = plan.trialDays ?? 7;
      console.log(
        `Creating subscription with ${trialDays} days trial for user ${userId}`,
      );

      // Create Product for the subscription
      const product = await this.stripeService.stripe.products.create({
        name: plan.name,
        description: description,
      });

      const subscriptionConfig = {
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product: product.id, // Use explicit Product ID
              unit_amount: Math.round(plan.price * 100),
              recurring: {
                interval: plan.interval,
                interval_count: plan.intervalCount,
              },
            },
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
        metadata: {
          userId: userId.toString(),
          planId: plan.id,
          type: "APP_SUBSCRIPTION",
          planName: plan.name,
          description: description,
        },
      };

      if (trialDays > 0) {
        subscriptionConfig.trial_period_days = trialDays;
      }

      const subscription =
        await this.stripeService.stripe.subscriptions.create(
          subscriptionConfig,
        );

      console.log("✅ Subscription created:", subscription.id);

      // Create pending transaction/subscription in DB
      if (trialDays > 0) {
        const now = new Date();
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000,
        );
        const initialStatus = "TRIALING";

        await this.subscriptionRepo.deleteSubscription({
          userId: userId,
          status: initialStatus,
        });

        await this.subscriptionRepo.createSubscription({
          userId: userId,
          planId: plan.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customer.id,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: currentPeriodEnd,
          status: initialStatus,
          cancelAtPeriodEnd: false,
        });

        // Update user subscription type to "premium" (Trials are premium)
        await this.userRepo.updateUserSubscriptionType(userId, "premium");

        // We also create a transaction record for tracking
        await this.subscriptionRepo.createTransaction({
          userId,
          planId: plan.id,
          amount: plan.price,
          currency: plan.currency,
          status: "PENDING",
          type: "SUBSCRIPTION",
          stripePaymentIntentId:
            subscription.latest_invoice?.payment_intent?.id || null,
          metadata: {
            subscriptionId: subscription.id,
            planName: plan.name,
            description: description,
            isTrial: true,
            trialDays: trialDays,
          },
        });
      } else {
        console.log(
          "No trial period. Subscription DB record will be created via webhook after successful payment.",
        );
      }

      // Return client secret for the frontend to confirm payment/setup
      const clientSecret = subscription.pending_setup_intent
        ? subscription.pending_setup_intent.client_secret
        : subscription.latest_invoice?.payment_intent?.client_secret;

      return {
        success: true,
        clientSecret: clientSecret,
        subscriptionId: subscription.id,
        description: description,
        message: "Subscription initiated successfully with trial",
      };
    } catch (error) {
      console.error("❌ Error in createAppSubscriptionCheckout:", error);
      throw new Error(`Failed to create mobile subscription: ${error.message}`);
    }
  }

  async handleWebhookEvent(event) {
    try {
      console.log(`Received webhook event: ${event.type}`);

      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case "invoice.payment_succeeded":
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error("Webhook error:", error);
      throw new Error(`Webhook handling failed: ${error.message}`);
    }
  }

  async handleSubscriptionDeleted(stripeSubscription) {
    try {
      console.log("Processing subscription deletion:", stripeSubscription.id);

      const existingSubscription =
        await this.subscriptionRepo.findSubscriptionByStripeId(
          stripeSubscription.id,
        );

      if (existingSubscription) {
        // Update subscription status to CANCELED
        await this.subscriptionRepo.updateSubscription(
          existingSubscription.id,
          {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: new Date(), // End it now
          },
        );

        // Revert user to free plan immediately
        await this.userRepo.updateUserSubscriptionType(
          existingSubscription.userId,
          "free",
        );

        console.log(
          `Subscription ${existingSubscription.id} canceled and user reverted to free plan.`,
        );
      }
    } catch (error) {
      console.error("Error handling subscription deletion:", error);
    }
  }

  async handleInvoicePaymentSucceeded(invoice) {
    try {
      if (!invoice.subscription) return;

      console.log("Processing invoice payment succeeded:", invoice.id);

      // Fetch subscription from Stripe to get latest dates
      const stripeSubscription = await this.stripeService.retrieveSubscription(
        invoice.subscription,
      );

      const currentPeriodStart = new Date(
        stripeSubscription.current_period_start * 1000,
      );
      const currentPeriodEnd = new Date(
        stripeSubscription.current_period_end * 1000,
      );
      const status = stripeSubscription.status.toUpperCase();

      // Update local subscription
      const existingSubscription =
        await this.subscriptionRepo.findSubscriptionByStripeId(
          invoice.subscription,
        );

      if (existingSubscription) {
        await this.subscriptionRepo.updateSubscription(
          existingSubscription.id,
          {
            status: status,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            stripeCustomerId: invoice.customer,
          },
        );

        // Ensure user type is set to premium on successful payment/renewal
        await this.userRepo.updateUserSubscriptionType(
          existingSubscription.userId,
          "premium",
        );

        console.log(
          `Updated subscription ${existingSubscription.id} after invoice payment`,
        );

        // Check if a transaction already exists for this payment intent (to prevent duplicates)
        let existingTransaction = null;
        if (invoice.payment_intent) {
          existingTransaction =
            await this.subscriptionRepo.findTransactionByStripePaymentIntent(
              invoice.payment_intent,
            );
        }

        if (existingTransaction) {
          console.log(
            `Transaction already exists for PaymentIntent ${invoice.payment_intent}, updating...`,
          );
          await this.subscriptionRepo.updateTransaction(
            existingTransaction.id,
            {
              status: "SUCCEEDED",
              stripeInvoiceId: invoice.id,
              description: `Subscription renewal/payment: ${invoice.number}`,
              metadata: {
                invoiceUrl: invoice.hosted_invoice_url,
                periodStart: currentPeriodStart,
                periodEnd: currentPeriodEnd,
              },
            },
          );
        } else {
          // Create a succeeded transaction record for this invoice
          await this.subscriptionRepo.createTransaction({
            userId: existingSubscription.userId,
            subscriptionId: existingSubscription.id,
            planId: existingSubscription.planId,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            status: "SUCCEEDED",
            type: "RENEWAL",
            stripePaymentIntentId: invoice.payment_intent,
            stripeInvoiceId: invoice.id,
            description: `Subscription renewal/payment: ${invoice.number}`,
            metadata: {
              invoiceUrl: invoice.hosted_invoice_url,
              periodStart: currentPeriodStart,
              periodEnd: currentPeriodEnd,
            },
          });
        }
      } else {
        // Fallback or New Subscription for No-Trial plans:
        // If no existing subscription is found in DB, it might be a new subscription that had 0 trial days,
        // so we relied on this webhook to create it.

        console.log(
          "Subscription not found in DB. Checking if it needs to be created (No-Trial Flow)...",
        );

        // Metadata should have been attached during subscription creation
        const metadata = stripeSubscription.metadata;

        if (metadata && metadata.userId && metadata.planId) {
          const userId = metadata.userId;
          const planId = metadata.planId;

          console.log(
            `Creating new ACTIVE subscription for user ${userId} via webhook.`,
            metadata,
          );

          // Double check if plan exists in our DB to get price/currency details if needed for transaction
          // Although we can get amount/currency from invoice.

          await this.subscriptionRepo.createSubscription({
            userId: userId,
            planId: planId,
            stripeSubscriptionId: invoice.subscription,
            stripeCustomerId: invoice.customer,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            status: "ACTIVE", // Payments succeeded, so it is active
            cancelAtPeriodEnd: false,
          });

          // Update user to premium
          await this.userRepo.updateUserSubscriptionType(userId, "premium");

          // Fetch the newly created subscription to get its DB ID
          const newSub = await this.subscriptionRepo.findSubscriptionByStripeId(
            invoice.subscription,
          );

          if (newSub) {
            // Create the transaction
            await this.subscriptionRepo.createTransaction({
              userId: userId,
              planId: planId,
              subscriptionId: newSub.id,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: "SUCCEEDED",
              type: "SUBSCRIPTION", // Initial payment
              stripePaymentIntentId: invoice.payment_intent,
              stripeInvoiceId: invoice.id,
              description: `Subscription payment: ${invoice.number}`,
              metadata: {
                invoiceUrl: invoice.hosted_invoice_url,
                periodStart: currentPeriodStart,
                periodEnd: currentPeriodEnd,
              },
            });
            console.log(
              `Created new subscription ${newSub.id} and transaction for user ${userId}`,
            );
          } else {
            console.error(
              "Failed to retrieve newly created subscription for transaction creation.",
            );
          }
        } else {
          console.warn(
            "Subscription not found and no metadata to create it:",
            invoice.id,
          );
        }
      }
    } catch (error) {
      console.error("Error handling invoice payment:", error);
    }
  }

  async handleSubscriptionUpdated(stripeSubscription) {
    try {
      console.log("Processing subscription update:", stripeSubscription.id);

      const existingSubscription =
        await this.subscriptionRepo.findSubscriptionByStripeId(
          stripeSubscription.id,
        );

      if (existingSubscription) {
        await this.subscriptionRepo.updateSubscription(
          existingSubscription.id,
          {
            status: stripeSubscription.status.toUpperCase(),
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000,
            ),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          },
        );
        console.log(
          `Synced subscription ${existingSubscription.id} with Stripe update`,
        );
      }
    } catch (error) {
      console.error("Error handling subscription update:", error);
    }
  }

  async handleCheckoutSessionCompleted(session) {
    try {
      const { userId, planId, type } = session.metadata;

      if (!userId || !planId || type !== "SUBSCRIPTION_PAYMENT") {
        console.warn("Invalid metadata in checkout session:", session.id);
        return;
      }

      // Check if this was a subscription mode session
      let stripeSubscriptionId = null;
      let currentPeriodStart = new Date();
      let currentPeriodEnd = new Date();
      let status = "ACTIVE";

      let existingSubscription = null;

      if (session.subscription) {
        // It's a subscription mode session
        stripeSubscriptionId = session.subscription;

        // 1. Try to find by Stripe Subscription ID first (Best match)
        existingSubscription =
          await this.subscriptionRepo.findSubscriptionByStripeId(
            stripeSubscriptionId,
          );

        // Fetch actual subscription details from Stripe
        // We use the stripe service instance attached to this class
        const stripeSubscription =
          await this.stripeService.retrieveSubscription(stripeSubscriptionId);

        if (stripeSubscription) {
          currentPeriodStart = new Date(
            stripeSubscription.current_period_start * 1000,
          );
          currentPeriodEnd = new Date(
            stripeSubscription.current_period_end * 1000,
          );
          status = stripeSubscription.status.toUpperCase(); // e.g. TRIALING, ACTIVE
        }
      } else {
        // Fallback for one-time payment mode (legacy support)
        const plan = await this.subscriptionRepo.findPlanById(planId);
        if (plan) {
          if (plan.interval === "month") {
            currentPeriodEnd.setMonth(
              currentPeriodStart.getMonth() + (plan.intervalCount || 1),
            );
          } else if (plan.interval === "year") {
            currentPeriodEnd.setFullYear(
              currentPeriodStart.getFullYear() + (plan.intervalCount || 1),
            );
          } else {
            currentPeriodEnd.setMonth(currentPeriodStart.getMonth() + 1);
          }
        }
      }

      // 2. Fallback: Find active subscription by User ID if not found by Stripe ID
      if (!existingSubscription) {
        existingSubscription =
          await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);
      }

      if (existingSubscription) {
        console.log(
          "Subscription already exists (updating):",
          existingSubscription.id,
        );
        // If it exists but we just completed a new checkout, we might want to update it
        // specially if we are switching plans or re-subscribing
        await this.subscriptionRepo.updateSubscription(
          existingSubscription.id,
          {
            stripeSubscriptionId:
              stripeSubscriptionId || existingSubscription.stripeSubscriptionId,
            currentPeriodStart,
            currentPeriodEnd,
            status,
            planId, // Update plan if changed
          },
        );

        await this.subscriptionRepo.updateTransactionByCheckoutSession(
          session.id,
          {
            status: "SUCCEEDED",
            stripePaymentIntentId: session.payment_intent,
            subscriptionId: existingSubscription.id,
          },
        );
        return;
      }

      const subscription = await this.subscriptionRepo.createSubscription({
        userId: userId,
        planId: planId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: session.customer,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        status: status,
        cancelAtPeriodEnd: false,
      });

      await this.userRepo.updateUserSubscriptionType(userId, "premium");

      await this.subscriptionRepo.updateTransactionByCheckoutSession(
        session.id,
        {
          status: "SUCCEEDED",
          subscriptionId: subscription.id,
          stripePaymentIntentId: session.payment_intent,
        },
      );

      console.log(
        `Subscription created for user ${userId} via webhook. Status: ${status}`,
      );
    } catch (error) {
      console.error("Error handling checkout session completed:", error);
      await this.subscriptionRepo.updateTransactionByCheckoutSession(
        session.id,
        {
          status: "FAILED",
        },
      );
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      console.log("Processing payment intent succeeded:", this.userRepo);

      const transaction =
        await this.subscriptionRepo.findTransactionByStripePaymentIntent(
          paymentIntent.id,
        );

      if (!transaction) {
        console.warn(
          "No transaction found for payment intent:",
          paymentIntent.id,
        );
        return;
      }

      if (transaction.status === "SUCCEEDED") {
        return;
      }
      const existingSubscription =
        await this.subscriptionRepo.findActiveSubscriptionByUserId(
          transaction.userId,
        );

      if (!existingSubscription) {
        const plan = await this.subscriptionRepo.findPlanById(
          transaction.planId,
        );
        if (!plan) {
          throw new Error(`Plan not found: ${transaction.planId}`);
        }

        const now = new Date();
        let currentPeriodEnd = new Date();

        if (plan.interval === "month") {
          currentPeriodEnd.setMonth(now.getMonth() + (plan.intervalCount || 1));
        } else if (plan.interval === "year") {
          currentPeriodEnd.setFullYear(
            now.getFullYear() + (plan.intervalCount || 1),
          );
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
          status: "ACTIVE",
          cancelAtPeriodEnd: false,
        });

        await this.userRepo.updateUserSubscriptionType(
          transaction.userId,
          "premium",
        );

        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: "SUCCEEDED",
          subscriptionId: subscription.id,
        });

        console.log(
          `Subscription created for user ${transaction.userId} via payment intent webhook`,
        );
      } else {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: "SUCCEEDED",
        });
        console.log(
          `Payment succeeded for existing subscription user: ${transaction.userId}`,
        );
      }
    } catch (error) {
      console.error("Error handling payment intent succeeded:", error);
      const transaction =
        await this.subscriptionRepo.findTransactionByStripePaymentIntent(
          paymentIntent.id,
        );
      if (transaction) {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: "FAILED",
        });
      }
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    try {
      console.log("Processing payment intent failed:", paymentIntent.id);

      const transaction =
        await this.subscriptionRepo.findTransactionByStripePaymentIntent(
          paymentIntent.id,
        );

      if (transaction) {
        await this.subscriptionRepo.updateTransaction(transaction.id, {
          status: "FAILED",
        });
        console.log(`Payment failed for transaction: ${transaction.id}`);
      }
    } catch (error) {
      console.error("Error handling payment intent failed:", error);
    }
  }

  async cancelSubscription(userId) {
    const activeSubscription =
      await this.subscriptionRepo.findActiveSubscriptionByUserId(userId);

    if (!activeSubscription) {
      throw new Error("No active subscription found");
    }

    if (!activeSubscription.stripeSubscriptionId) {
      throw new Error("Subscription cannot be cancelled (missing Stripe ID)");
    }

    if (activeSubscription.status === "TRIALING") {
      // Scenario 1: Trial User - Cancel IMMEDIATELY
      await this.stripeService.cancelSubscriptionImmediately(
        activeSubscription.stripeSubscriptionId,
      );

      // Update local DB to reflect immediate cancellation
      await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
        status: "CANCELED",
        cancelAtPeriodEnd: false, // It's pointless now as it's canceled
        currentPeriodEnd: new Date(), // End access now
      });

      // Downgrade user immediately
      await this.userRepo.updateUserSubscriptionType(userId, "free");

      return {
        message:
          "Trial canceled immediately. You no longer have premium access and will not be charged.",
        canceledImmediately: true,
      };
    } else {
      // Scenario 2: Paid User (ACTIVE) - Cancel at Period End
      await this.stripeService.cancelSubscription(
        activeSubscription.stripeSubscriptionId,
      );

      // Update local DB
      await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
        cancelAtPeriodEnd: true,
      });

      // User status remains ACTIVE until the period ends (handled by webhook or expiration check)

      const formattedDate = new Date(
        activeSubscription.currentPeriodEnd,
      ).toLocaleDateString();

      return {
        message: `Subscription canceled. Your premium access remains valid until ${formattedDate}.`,
        canceledImmediately: false,
        validUntil: activeSubscription.currentPeriodEnd,
      };
    }
  }

  async getUserSubscriptionStatus(userId) {
    const userWithSubscription =
      await this.subscriptionRepo.getUserWithSubscription(userId);

    if (!userWithSubscription) {
      throw new Error("User not found");
    }

    const activeSubscription = userWithSubscription.subscriptions[0];
    const isPremium =
      activeSubscription &&
      (activeSubscription.status === "ACTIVE" ||
        activeSubscription.status === "TRIALING") &&
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

  async getSubscriptionPlans(user) {
    // Check if user has an active subscription
    const result = await this.subscriptionRepo.isUserSubscribed(user.id);

    if (result.isSubscribed) {
      return {
        isSubscribed: true,
        subscription: result.subscription,
      };
    }

    return await this.subscriptionRepo.getAllSubscriptionPlans();
  }

  async validatePremiumAccess(userId) {
    const status = await this.getUserSubscriptionStatus(userId);

    if (!status.hasAccessToPremium) {
      throw new Error("Premium subscription required to access this content");
    }

    return true;
  }

  // Admin methods
  async createPlan(planData) {
    try {
      const {
        name,
        price,
        interval,
        intervalCount = 1,
        trialDays,
        currency = "usd",
      } = planData;

      if (!name || !price || !interval) {
        throw new Error("Name, price, and interval are required");
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
        throw new Error("Subscription plan not found");
      }

      const updatedPlan = await this.subscriptionRepo.updatePlan(
        planId,
        planData,
      );
      return updatedPlan;
    } catch (error) {
      throw new Error(`Failed to update subscription plan: ${error.message}`);
    }
  }

  async togglePlanVisibility(planId) {
    try {
      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) {
        throw new Error("Subscription plan not found");
      }

      const updatedPlan = await this.subscriptionRepo.updatePlan(planId, {
        visible: !plan.visible,
      });

      return updatedPlan;
    } catch (error) {
      throw new Error(`Failed to toggle plan visibility: ${error.message}`);
    }
  }

  async getSubscriptions(filters = {}) {
    try {
      const { page = 1, limit = 10, status, userId, planId, search } = filters;

      const result = await this.subscriptionRepo.getSubscriptions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        userId: userId ? userId : undefined,
        planId,
        search,
      });

      return result;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  async getSubscriptionById(subscriptionId) {
    try {
      const subscription =
        await this.subscriptionRepo.findSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  async adminCancelSubscription(subscriptionId) {
    try {
      const subscription =
        await this.subscriptionRepo.findSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Update in database only (internal cancellation)
      const updatedSubscription =
        await this.subscriptionRepo.updateSubscription(subscriptionId, {
          status: "CANCELED",
          cancelAtPeriodEnd: true,
        });

      // Downgrade user
      await this.userRepo.updateUserSubscriptionType(
        subscription.userId,
        "free",
      );

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
        subscriptionId,
      } = filters;

      const result = await this.subscriptionRepo.getAdminTransactions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        userId: userId ? userId : undefined,
        subscriptionId,
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }
}
