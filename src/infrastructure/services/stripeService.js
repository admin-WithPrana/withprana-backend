import Stripe from 'stripe';

export class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCustomer(user) {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id.toString(),
        },
      });
      return customer;
    } catch (error) {
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  async createSubscription(customerId, priceId) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async createPaymentIntent(amount, currency = 'usd', customerId = null) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async constructEvent(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async cancelSubscription(stripeSubscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(stripeSubscriptionId);
      return subscription;
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async retrieveSubscription(stripeSubscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      return subscription;
    } catch (error) {
      throw new Error(`Failed to retrieve subscription: ${error.message}`);
    }
  }
}