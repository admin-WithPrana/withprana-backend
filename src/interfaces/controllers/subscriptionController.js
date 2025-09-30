export class SubscriptionController {
  constructor(subscriptionUseCases) {
    this.subscriptionUseCases = subscriptionUseCases;
  }

  async createCheckoutSession(request, reply) {
    try {
      const { planId } = request.body;
      const userId = request.user.id;

      const result = await this.subscriptionUseCases.createSubscriptionCheckout(
        userId,
        planId
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async handleWebhook(request, reply) {
    try {
      const signature = request.headers["stripe-signature"];
      const payload = request.rawBody;

      await this.subscriptionUseCases.handleWebhookEvent(payload, signature);

      return reply.code(200).send({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getSubscriptionStatus(request, reply) {
    try {
      const userId = request.user.id;
      const status = await this.subscriptionUseCases.getUserSubscriptionStatus(
        userId
      );

      return reply.code(200).send({
        success: true,
        data: status,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async cancelSubscription(request, reply) {
    try {
      const userId = request.user.id;
      const result = await this.subscriptionUseCases.cancelSubscription(userId);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getTransactionHistory(request, reply) {
    try {
      const userId = request.user.id;
      const filters = request.query;

      const result = await this.subscriptionUseCases.getTransactionHistory(
        userId,
        filters
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getPlans(request, reply) {
    try {
      const plans = await this.subscriptionUseCases.getSubscriptionPlans();

      return reply.code(200).send({
        success: true,
        data: plans,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async validatePremiumAccess(request, reply) {
    try {
      const userId = request.user.id;
      await this.subscriptionUseCases.validatePremiumAccess(userId);

      return reply.code(200).send({
        success: true,
        message: "Premium access granted",
      });
    } catch (error) {
      return reply.code(403).send({
        success: false,
        message: error.message,
      });
    }
  }

  async createPlan(request, reply) {
    try {
      const planData = request.body;

      const plan = await this.subscriptionUseCases.createPlan(planData);

      return reply.code(201).send({
        success: true,
        message: "Subscription plan created successfully",
        data: plan,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  // Admin: Update subscription plan
  async updatePlan(request, reply) {
    try {
      const { planId } = request.params;
      const planData = request.body;

      const plan = await this.subscriptionUseCases.updatePlan(planId, planData);

      return reply.code(200).send({
        success: true,
        message: "Subscription plan updated successfully",
        data: plan,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  // Admin: Toggle plan visibility
  async togglePlanVisibility(request, reply) {
    try {
      const { planId } = request.params;

      const plan = await this.subscriptionUseCases.togglePlanVisibility(planId);

      return reply.code(200).send({
        success: true,
        message: `Plan ${
          plan.visible ? "activated" : "deactivated"
        } successfully`,
        data: plan,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getSubscriptions(request, reply) {
    try {
      const filters = request.query;

      const result = await this.subscriptionUseCases.getSubscriptions(filters);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getSubscriptionById(request, reply) {
    try {
      const { subscriptionId } = request.params;

      const subscription = await this.subscriptionUseCases.getSubscriptionById(
        subscriptionId
      );

      return reply.code(200).send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  // Admin: Cancel subscription
  async adminCancelSubscription(request, reply) {
    try {
      const { subscriptionId } = request.params;

      const result = await this.subscriptionUseCases.adminCancelSubscription(
        subscriptionId
      );

      return reply.code(200).send({
        success: true,
        message: "Subscription cancelled successfully",
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  // Admin: Get all transactions with pagination
  async getAdminTransactions(request, reply) {
    try {
      const filters = request.query;

      const result = await this.subscriptionUseCases.getAdminTransactions(
        filters
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }
}
