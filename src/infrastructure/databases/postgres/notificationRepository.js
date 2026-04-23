export class NotificationRepository {
  constructor(prisma) {
    if (!prisma) {
      throw new Error("Prisma client is required");
    }
    this.prisma = prisma;
  }

  async createBatch(notifications) {
    try {
      const result = await this.prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true
      });
      return result;
    } catch (error) {
      console.error("Error batch creating notifications:", error);
      throw error;
    }
  }

  async getByUserId(userId, { page = 1, limit = 20 } = {}) {
    try {
      const skip = (page - 1) * limit;
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      });

      const total = await this.prisma.notification.count({
        where: { userId }
      });

      return {
        data: notifications,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      console.error("Error finding notifications by user ID:", error);
      throw error;
    }
  }

  async markAsViewed(id, userId) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { viewed: true }
      });
      return result;
    } catch (error) {
      console.error("Error marking notification as viewed:", error);
      throw error;
    }
  }

  async markAllAsViewed(userId) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, viewed: false },
        data: { viewed: true }
      });
      return result;
    } catch (error) {
      console.error("Error marking all notifications as viewed:", error);
      throw error;
    }
  }

  async deleteOne(id, userId) {
    try {
      // Using deleteMany to enforce userId ownership
      const result = await this.prisma.notification.deleteMany({
        where: { id, userId }
      });
      return result;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }
}
