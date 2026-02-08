export class SubscriptionUseCases {
  constructor(
    subscriptionRepository,
    userRepository,
    stripeService,
    notificationService,
  ) {
    this.subscriptionRepo = subscriptionRepository;
    this.userRepo = userRepository;
    this.stripeService = stripeService;
    this.notificationService = notificationService;
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

      const customer = await this.stripeService.createOrGetCustomer(user);

      if (user.stripeCustomerId !== customer.id) {
        await this.subscriptionRepo.updateUserStripeCustomerId(
          userId,
          customer.id,
        );
      }

      const trialDays = plan.trialDays ?? 7;
      console.log(
        `[DEBUG] createSubscriptionCheckout: Plan ${plan.name} has trialDays: ${trialDays}`,
      );

      const sessionConfig = {
        customer: customer.id,
        payment_method_collection: "always",
        payment_method_types: ["card"],
        mode: "subscription",
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: userId.toString(),
          planId: plan.id,
          type: "SUBSCRIPTION_PAYMENT",
        },
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: plan.name,
                description: `${plan.intervalCount} ${plan.interval}(s) subscription`,
              },
              unit_amount: Math.round(plan.price * 100),
              recurring: {
                interval: plan.interval,
                interval_count: plan.intervalCount,
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            planId: plan.id,
          },
        },
      };

      if (trialDays > 0) {
        console.log(
          "[DEBUG] Using PAYMENT mode (Validation Charge) for trial subscription",
        );
        // For trials, we charge a small amount to validate and remove the card, then refund.
        sessionConfig.mode = "payment";
        sessionConfig.currency = plan.currency.toLowerCase();

        // Remove subscription-specific fields
        delete sessionConfig.subscription_data;

        // Add Validation Line Item (e.g., 1.00)
        sessionConfig.line_items = [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: "Card Validation (Refundable)",
                description:
                  "A temporary charge to validate your card. This will be fully refunded immediately.",
              },
              unit_amount: 100, // 1.00 unit (e.g., $1.00 or ₹1.00 if INR handles cents differently usually 100 paise)
            },
            quantity: 1,
          },
        ];

        // IMPORTANT: Save the card for future use (the subscription)
        sessionConfig.payment_intent_data = {
          setup_future_usage: "off_session",
        };

        // Update metadata for the webhook handler
        sessionConfig.metadata = {
          ...sessionConfig.metadata,
          type: "TRIAL_VALIDATION_CHARGE", // New Type
          trialDays: trialDays.toString(),
          planPrice: plan.price.toString(),
          planCurrency: plan.currency,
          planName: plan.name,
          planInterval: plan.interval,
          planIntervalCount: plan.intervalCount.toString(),
        };
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

  async sendTrialSubscriptionEmail(user, plan, trialEndDate) {
    try {
      if (!this.mailer) {
        console.warn("Mailer not initialized, skipping trial email.");
        return;
      }

      const trialEnd = new Date(trialEndDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const nextBillingDate = trialEnd;
      const amount = `${plan.currency.toUpperCase()} ${plan.price}`;

      await this.notificationService.sendTrialStartedEmail(
        user,
        plan,
        trialEndDate,
      );
      console.log(`Trial subscription email sent to ${user.email}`);
    } catch (error) {
      console.error("Failed to send trial subscription email:", error);
      // Don't throw error to prevent rolling back successful subscription
    }
  }

  async createAppSubscriptionCheckout(userId, planId) {
    try {
      console.log("Starting app checkout for user:", userId);

      const user = await this.userRepo.findById(userId);
      if (!user) throw new Error("User not found");

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) throw new Error("Invalid subscription plan");

      const trialDays = plan.trialDays ?? 7;
      console.log(
        `[DEBUG] createAppSubscriptionCheckout: Plan ${plan.name} has trialDays: ${trialDays}`,
      );

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

      // debug fix - removed duplicate declaration
      if (trialDays > 0) {
        console.log(
          `[DEBUG] createAppSubscriptionCheckout: creating Validation Charge for trial plan.`,
        );

        // Create a PaymentIntent for 1.00 unit to validate card
        const paymentIntent =
          await this.stripeService.stripe.paymentIntents.create({
            amount: 100, // 1.00 unit
            currency: plan.currency.toLowerCase(),
            customer: customer.id,
            setup_future_usage: "off_session",
            description: "Card Validation (Refundable)",
            metadata: {
              type: "APP_TRIAL_VALIDATION",
              userId: userId.toString(),
              planId: plan.id,
              planName: plan.name,
              planPrice: plan.price.toString(),
              planCurrency: plan.currency,
              planInterval: plan.interval,
              planIntervalCount: plan.intervalCount.toString(),
              trialDays: trialDays.toString(),
            },
          });

        // Create transaction record for this validation charge
        await this.subscriptionRepo.createTransaction({
          userId,
          planId: plan.id,
          amount: 1, // 1.00
          currency: plan.currency,
          status: "PENDING",
          type: "VALIDATION",
          stripePaymentIntentId: paymentIntent.id,
          description: "Trial Validation Charge",
          metadata: {
            type: "APP_TRIAL_VALIDATION",
          },
        });

        const ephemeralKey = await this.stripeService.createEphemeralKey(
          customer.id,
        );

        return {
          success: true,
          clientSecret: paymentIntent.client_secret,
          customerId: customer.id,
          ephemeralKey: ephemeralKey.secret,
          trialValidation: true, // Flag to tell frontend this is a validation charge
        };
      }

      // NO TRIAL - Standard Subscription Creation
      console.log(`Creating subscription (No Trial) for user ${userId}`);

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

      const subscription =
        await this.stripeService.stripe.subscriptions.create(
          subscriptionConfig,
        );

      console.log("✅ Subscription created:", subscription.id);

      const clientSecret = subscription.pending_setup_intent
        ? subscription.pending_setup_intent.client_secret
        : subscription.latest_invoice?.payment_intent?.client_secret;

      // Create Ephemeral Key for Mobile SDK
      const ephemeralKey = await this.stripeService.createEphemeralKey(
        customer.id,
      );

      return {
        success: true,
        clientSecret: clientSecret,
        subscriptionId: subscription.id,
        customerId: customer.id,
        ephemeralKey: ephemeralKey.secret,
        requiresPaymentMethod: !!subscription.pending_setup_intent, // Flag for frontend
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
        await this.subscriptionRepo.updateSubscription(
          existingSubscription.id,
          {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: new Date(),
          },
        );

        await this.userRepo.updateUserSubscriptionType(
          existingSubscription.userId,
          "Free",
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

          // Send Payment Accepted Email
          const user = await this.userRepo.findById(
            existingSubscription.userId,
          );
          if (user) {
            await this.notificationService.sendPaymentAcceptedEmail(
              user,
              invoice.amount_paid / 100,
              invoice.currency,
              invoice.hosted_invoice_url,
            );
          }
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

          // Get Subscription details from Stripe to verify payment method
          // fetching stripeSubscription which was already fetched above.
          const sub = stripeSubscription;

          // STRICT CHECK: For trials, ensure a default payment method is set on the subscription
          let finalStatus = status;
          if (
            sub.status === "trialing" &&
            !sub.default_payment_method &&
            !invoice.default_payment_method
          ) {
            console.log(
              "No payment method found for trial. Marking as INCOMPLETE locally.",
            );
            finalStatus = "INCOMPLETE";
          }

          // Get Plan details for Email and Transaction
          const plan = await this.subscriptionRepo.findPlanById(planId);
          // Get User for Email
          const user = await this.userRepo.findById(userId);

          await this.subscriptionRepo.createSubscription({
            userId: userId,
            planId: planId,
            stripeSubscriptionId: invoice.subscription,
            stripeCustomerId: invoice.customer,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            status: finalStatus, // Use the gated status
            cancelAtPeriodEnd: false,
          });

          // Update user to premium ONLY if status is NOT INCOMPLETE
          if (finalStatus !== "INCOMPLETE") {
            await this.userRepo.updateUserSubscriptionType(userId, "premium");
          } else {
            // Ensure they stay on Free if incomplete
            await this.userRepo.updateUserSubscriptionType(userId, "Free");
          }

          // Fetch the newly created subscription to get its DB ID
          const newSub = await this.subscriptionRepo.findSubscriptionByStripeId(
            invoice.subscription,
          );

          // Send Trial Email if status is TRIALING (and valid)
          if (finalStatus === "TRIALING" && plan && user) {
            await this.notificationService.sendTrialStartedEmail(
              user,
              plan,
              currentPeriodEnd,
            );
          } else if (finalStatus === "ACTIVE" && plan && user) {
            // Send Subscription Started Email (Non-Trial)
            await this.notificationService.sendSubscriptionStartedEmail(
              user,
              plan,
              currentPeriodEnd,
            );
          }

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

      // Handle Trial Validation Charge (Charge & Refund flow)
      if (type === "TRIAL_VALIDATION_CHARGE") {
        await this.handleTrialValidationSuccess(session);
        return;
      }

      // Handle Trial Setup Session
      if (type === "SUBSCRIPTION_TRIAL_SETUP") {
        await this.handleTrialSetupCompleted(session);
        return;
      }

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
      console.log("Processing payment intent succeeded:");

      // Check for Trial Validation Charge
      if (
        paymentIntent.metadata &&
        (paymentIntent.metadata.type === "TRIAL_VALIDATION_CHARGE" ||
          paymentIntent.metadata.type === "APP_TRIAL_VALIDATION")
      ) {
        // Construct a mock "session" object since handleTrialValidationSuccess expects session-like structure with metadata
        // and payment_intent property.
        const mockSession = {
          id: paymentIntent.id, // Use PI ID as session ID for logging/transaction update
          metadata: paymentIntent.metadata,
          payment_intent: paymentIntent.id,
          customer: paymentIntent.customer,
        };
        await this.handleTrialValidationSuccess(mockSession);
        return;
      }

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

    // Get User details for email
    const user = await this.userRepo.findById(userId);
    const userEmail = user ? user.email : "Unknown Email";

    // CANCEL IMMEDIATELY FOR ALL (Paid or Trial)
    try {
      await this.stripeService.cancelSubscriptionImmediately(
        activeSubscription.stripeSubscriptionId,
      );
    } catch (error) {
      // If subscription is already canceled/deleted in Stripe, we proceed to update local DB
      if (error.message && error.message.includes("No such subscription")) {
        console.warn(
          `Stripe subscription ${activeSubscription.stripeSubscriptionId} already deleted. Proceeding with local cancellation.`,
        );
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Update local DB
    // Handle unique constraint @@unique([userId, status]) - REMOVED so we can just update status
    try {
      await this.subscriptionRepo.updateSubscription(activeSubscription.id, {
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(), // End access immediately
      });
    } catch (error) {
      console.warn(
        "Failed to update subscription status to CANCELED:",
        error.message,
      );
      // We still proceed to downgrade user
    }

    // Downgrade user immediately
    await this.userRepo.updateUserSubscriptionType(userId, "Free");

    // Send Email to Admin
    if (this.mailer) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
      try {
        await this.mailer.sendMail({
          from: process.env.MAIL_FROM || '"Prana App" <no-reply@prana.app>',
          to: adminEmail,
          subject: "User Subscription Cancelled - Refund Action Required",
          html: `
                  <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Subscription Cancellation Alert</h2>
                    <p>User <strong>${userEmail}</strong> (ID: ${userId}) has cancelled their subscription.</p>
                    <p><strong>Action Required:</strong> Please check if a refund is due and process it manually in the Stripe Dashboard.</p>
                    <p>The user's access has been revoked and plan downgraded to Free.</p>
                  </div>
                `,
        });
        console.log(`Admin notification sent for user ${userId} cancellation.`);
      } catch (mailError) {
        console.error("Failed to send admin notification:", mailError);
      }
    }

    // Send Cancellation Confirmation to User
    if (this.mailer && userEmail && userEmail !== "Unknown Email") {
      try {
        await this.mailer.sendMail({
          from:
            process.env.MAIL_FROM ||
            '"Being One Within" <no-reply@beingonewithin.app>',
          to: userEmail,
          subject: "Subscription Canceled - Being One Within",
          html: `
                  <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Subscription Canceled</h2>
                    <p>Hello,</p>
                    <p>Your subscription to <strong>Being One Within</strong> has been canceled as requested.</p>
                    <p>Your account has been downgraded to the Free plan. You will no longer be charged.</p>
                    <p>We're sorry to see you go! If you have any feedback or questions, please reply to this email.</p>
                    <br/>
                    <p>Best regards,<br>The Being One Within Team</p>
                  </div>
                `,
        });
        console.log(`Cancellation email sent to user ${userEmail}`);
      } catch (userMailError) {
        console.error("Failed to send user cancellation email:", userMailError);
      }
    }

    return {
      message:
        "Subscription canceled immediately. Your plan has been downgraded to Free.",
      canceledImmediately: true,
    };
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
        "Free",
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

  async handleTrialValidationSuccess(session) {
    try {
      const {
        userId,
        planId,
        trialDays,
        planPrice,
        planCurrency,
        planName,
        planInterval,
        planIntervalCount,
      } = session.metadata;

      const paymentIntentId = session.payment_intent;

      console.log(
        `Processing Trial Validation for User ${userId}. PI: ${paymentIntentId}`,
      );

      // 1. REFUND THE VALIDATION CHARGE
      try {
        await this.stripeService.stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer", // or 'duplicate' or null. 'requested_by_customer' is fine or just leave default.
          metadata: { reason: "Trial Validation Refund" },
        });
        console.log("✅ Validation check refunded.");
      } catch (refundError) {
        console.error(
          "⚠️ Failed to refund validation charge:",
          refundError.message,
        );
        // Continue to create subscription? Yes, don't block user access if refund fails (can be manual).
      }

      // 2. Retrieve Payment Intent to get Payment Method
      const paymentIntent =
        await this.stripeService.stripe.paymentIntents.retrieve(
          paymentIntentId,
        );
      const paymentMethodId = paymentIntent.payment_method;

      if (!paymentMethodId) {
        throw new Error("No payment method found in PaymentIntent");
      }

      // 3. Create the Subscription with Trial
      console.log(
        `Creating trial subscription (${trialDays} days) for user ${userId} using PM ${paymentMethodId}`,
      );

      const customerId = session.customer;

      const plan = await this.subscriptionRepo.findPlanById(planId);
      if (!plan) throw new Error("Plan not found");

      // FIX: Create product first, as subscriptions.create doesn't support product_data in price_data
      const product = await this.stripeService.stripe.products.create({
        name: planName,
      });

      const subscriptionConfig = {
        customer: customerId,
        default_payment_method: paymentMethodId,
        trial_period_days: parseInt(trialDays),
        items: [
          {
            price_data: {
              currency: planCurrency.toLowerCase(),
              product: product.id, // Use the created product ID
              unit_amount: Math.round(parseFloat(planPrice) * 100),
              recurring: {
                interval: planInterval,
                interval_count: parseInt(planIntervalCount),
              },
            },
          },
        ],
        metadata: {
          userId: userId,
          planId: planId,
          type: "APP_SUBSCRIPTION",
        },
      };

      const subscription =
        await this.stripeService.stripe.subscriptions.create(
          subscriptionConfig,
        );

      console.log("✅ Trial Subscription created:", subscription.id);

      // 4. Update DB
      const currentPeriodStart = new Date(
        subscription.current_period_start * 1000,
      );
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      const newSub = await this.subscriptionRepo.createSubscription({
        userId: userId,
        planId: planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        status: subscription.status.toUpperCase(),
        cancelAtPeriodEnd: false,
      });

      // Update user to premium
      await this.userRepo.updateUserSubscriptionType(userId, "premium");

      // Send Email
      const user = await this.userRepo.findById(userId);
      await this.sendTrialSubscriptionEmail(user, plan, currentPeriodEnd);

      // Update Transaction (The Validation Charge)
      await this.subscriptionRepo.updateTransactionByCheckoutSession(
        session.id,
        {
          status: "REFUNDED", // Since we refunded it
          description: "Trial Validation Charge (Refunded)",
          subscriptionId: newSub.id,
          stripePaymentIntentId: paymentIntentId,
          metadata: {
            ...session.metadata,
            subscriptionId: subscription.id,
            refunded: true,
          },
        },
      );
    } catch (error) {
      console.error("Error handling trial validation success:", error);
      // FIX: Pass stripePaymentIntentId so repository can find the transaction
      await this.subscriptionRepo.updateTransactionByCheckoutSession(
        session.id,
        {
          status: "FAILED",
          description: `Trial validation processing failed: ${error.message}`,
          stripePaymentIntentId: session.payment_intent, // Required for lookup if session.id is a PI
        },
      );
      throw error;
    }
  }
}
