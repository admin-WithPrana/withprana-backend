export class SubscriptionRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createSubscription(data) {
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: BigInt(data.userId),
        planId: data.planId,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        stripeCustomerId: data.stripeCustomerId || null,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        status: data.status,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      }
    });
  
    return await this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            subscriptionType: true,
          },
        },
      },
    });
  }

  async updateSubscription(id, data) {
    return await this.prisma.subscription.update({
      where: { id },
      data,
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            subscriptionType: true,
          },
        },
      },
    });
  }

  async findActiveSubscriptionByUserId(userId) {
    return await this.prisma.subscription.findFirst({
      where: {
        userId: BigInt(userId),
        status: "ACTIVE",
        currentPeriodEnd: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
    });
  }

  async createTransaction(data) {
    return console.log(data)
    return await this.prisma.transaction.create({
      data: {
        userId: BigInt(data.userId),
        subscriptionId: data.subscriptionId || null,
        planId: data.planId || null,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: data.status,
        type: data.type || 'SUBSCRIPTION',
        stripePaymentIntentId: data.stripePaymentIntentId || null,
        stripeInvoiceId: data.stripeInvoiceId || null,
        description: data.description || null,
        metadata: data.metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: true,
        subscription: true,
      },
    });
  }

  async updateTransaction(id, data) {
    return await this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: true,
        subscription: true,
      },
    });
  }

  async updateTransactionByCheckoutSession(checkoutSessionId, data) {
    // Find transaction by checkout session ID in metadata
    const transaction = await this.prisma.transaction.findFirst({
      where: { 
        metadata: {
          path: ['checkoutSessionId'],
          equals: checkoutSessionId
        }
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found for checkout session: ' + checkoutSessionId);
    }

    return await this.prisma.transaction.update({
      where: { id: transaction.id },
      data,
    });
  }

  async findTransactionByStripePaymentIntent(stripePaymentIntentId) {
    return await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId },
      include: {
        user: true,
        subscription: true,
        // plan: true,
      },
    });
  }

  async getUserTransactions(userId, filters = {}) {
    const { page = 1, limit = 10, status, type } = filters;
    const skip = (page - 1) * limit;

    const where = {
      userId: BigInt(userId),
      ...(status && { status }),
      ...(type && { type }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          plan: true,
          subscription: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserWithSubscription(userId) {
    return await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
            currentPeriodEnd: {
              gt: new Date(),
            },
          },
          include: {
            plan: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async getAllSubscriptionPlans() {
    try {
        return await this.prisma.subscriptionPlan.findMany({
      where: { visible: true },
        orderBy: { price: "asc" },
      });
    } catch (error) {
      console.error(error)
      throw new Error('Failed to get all subscription plans');
    }
  }

  async createPlan(data) {
    try {
      return await this.prisma.subscriptionPlan.create({
        data,
      });
    } catch (error) {
      console.error(error)
      throw new Error('Failed to create subscription plan');
    }
  }

  async updatePlan(planId, data) {
    try {
      return await this.prisma.subscriptionPlan.update({
        where: { id: planId },
        data,
      });
    } catch (error) {
      console.error(error)
      throw new Error('Failed to update subscription plan by ID: ' + planId);
    }
  }

  async findPlanById(planId) {
    try {
      console.log(planId)
      return await this.prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });
    } catch (error) {
      console.error(error)
      throw new Error('Failed to find subscription plan by ID: ' + planId);
    }
  }

  async getSubscriptions(filters = {}) {
    const { page = 1, limit = 10, status, userId, planId, search } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(userId && { userId: BigInt(userId) }),
      ...(planId && { planId }),
      ...(search && {
        OR: [
          { user: { email: { contains: search, mode: "insensitive" } } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { plan: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              subscriptionType: true,
            },
          },
          plan: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findSubscriptionById(subscriptionId) {
    return await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            subscriptionType: true,
          },
        },
        plan: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  async getAdminTransactions(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      userId,
      subscriptionId,
    } = filters;

    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...(userId && { userId: BigInt(userId) }),
      ...(subscriptionId && { subscriptionId }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStripeCustomerId(userId, stripeCustomerId) {
    return await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { stripeCustomerId },
    });
  }
}