export class SubscriptionService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createSubscription(userId, planId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd) {
    return await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        planId,
        stripeSubscriptionId,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        planId,
        stripeSubscriptionId,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
      },
    });
  }

  async cancelSubscription(userId) {
    return await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
      },
    });
  }

  async updateSubscriptionStatus(stripeSubscriptionId, status) {
    return await this.prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { status },
    });
  }

  async getUserSubscription(userId) {
    return await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async isUserSubscriptionActive(userId) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return false;

    const now = new Date();
    return (
      subscription.status === 'ACTIVE' &&
      subscription.currentPeriodEnd > now &&
      !subscription.cancelAtPeriodEnd
    );
  }

  async createTransaction(transactionData) {
    return await this.prisma.transaction.create({
      data: transactionData,
    });
  }

  async updateTransactionStatus(stripePaymentIntentId, status) {
    return await this.prisma.transaction.update({
      where: { stripePaymentIntentId },
      data: { status },
    });
  }

  async getUserTransactions(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    return await this.prisma.transaction.findMany({
      where: { userId },
      include: {
        plan: true,
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  async getSubscriptionPlans() {
    return await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
    });
  }
}