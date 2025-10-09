export class SubscriptionRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createSubscription(data) {
    return await this.prisma.subscription.create({
      data: {
        ...data,
        userId: BigInt(data.userId),
      },
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

  async findSubscriptionByStripeId(stripeSubscriptionId) {
    return await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      include: {
        plan: true,
        user: true,
      },
    });
  }

  async createTransaction(data) {
    return await this.prisma.transaction.create({
      data: {
        ...data,
        userId: BigInt(data.userId),
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

  async findTransactionByStripePaymentIntent(stripePaymentIntentId) {
    return await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId },
      include: {
        user: true,
        subscription: true,
        plan: true,
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

  async updateUserStripeCustomerId(userId, stripeCustomerId) {
    return await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { stripeCustomerId },
    });
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
    return await this.prisma.subscriptionPlan.findMany({
      // where: { active: true },
      orderBy: { price: "asc" },
    });
  }

  async findPlanByStripePriceId(stripePriceId) {
    return await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId },
    });
  }

  async createPlan(data) {
    return await this.prisma.subscriptionPlan.create({
      data,
    });
  }

  async updatePlan(planId, data) {
    return await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data,
    });
  }

  async findPlanById(planId) {
    return await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
  }

  // Admin: Get all subscriptions with pagination
  async getSubscriptions(filters = {}) {
    const { page = 1, limit = 10,status,userId,planId,search} = filters;

    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(userId && { userId }),
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
      ...(userId && { userId }),
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
}
