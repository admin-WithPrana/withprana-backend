export class DashboardRepository {
  constructor(prisma) {
    if (!prisma) {
      throw new Error("Prisma client is required for DashboardRepository");
    }
    this.prisma = prisma;
  }

  async getStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        newUsersLast30Days,
        totalMeditations,
        activeSubscriptions,
        totalRevenueResult,
      ] = await Promise.all([
        // Total Users
        this.prisma.user.count(),

        // Active Users
        this.prisma.user.count({
          where: { active: true },
        }),

        // New Users (Last 30 Days)
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        }),

        // Total Meditations
        this.prisma.meditation.count({
          where: { isDeleted: false },
        }),

        // Active Subscriptions
        this.prisma.subscription.count({
          where: { status: "ACTIVE" },
        }),

        // Total Revenue
        this.prisma.transaction.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: "SUCCEEDED",
          },
        }),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          newLast30Days: newUsersLast30Days,
        },
        content: {
          meditations: totalMeditations,
        },
        subscriptions: {
          active: activeSubscriptions,
        },
        revenue: {
          total: totalRevenueResult._sum.amount || 0,
        },
      };
    } catch (error) {
      console.error("Error in DashboardRepository.getStats:", error);
      throw error;
    }
  }
}
