import { decrypt, decryptDeterministic } from "../../../utils/encryption.js";

export class PrismaUserRepository {
  constructor(prisma) {
    if (!prisma) {
      throw new Error("Prisma client is required");
    }
    this.prisma = prisma;
  }

  _decryptUser(user) {
    if (!user) return user;
    const decrypted = { ...user };
    if (decrypted.name) decrypted.name = decrypt(decrypted.name);
    if (decrypted.email)
      decrypted.email = decryptDeterministic(decrypted.email);
    return decrypted;
  }

  async findByEmail(email) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  async createUser(user) {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          image: user.image,
          signupMethod: user.signupMethod,
          subscriptionType: user.subscriptionType,
          email: user.email.toLowerCase(),
          name: user.name,
          password: user.password,
          isVerified: user?.isVerified ?? false,
          active: user?.active ?? false,
        },
      });

      return this._decryptUser(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async verifyEmail(email) {
    try {
      const user = await this.prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          isVerified: true,
          active: true,
        },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error verifying email:", error);
      throw error;
    }
  }

  async findAll({
    signupMethod,
    subscriptionType,
    page = 1,
    limit = 10,
    sort,
    order,
  } = {}) {
    try {
      const where = {};
      if (signupMethod) where.signupMethod = signupMethod;
      if (subscriptionType) where.subscriptionType = subscriptionType;

      const skip = (page - 1) * limit;
      const take = limit;

      const users = await this.prisma.user.findMany({
        where,
        skip,
        take,
        ...(sort && {
          orderBy: {
            [sort]: order?.toLowerCase() === "asc" ? "asc" : "desc",
          },
        }),
      });

      const total = await this.prisma.user.count({ where });

      return {
        data: users.map((user) =>
          this._decryptUser({ ...user, id: Number(user.id) })
        ),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error finding all users:", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(id) },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const user = await this.prisma.user.update({
        where: { id: Number(id) },
        data,
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async updateUser(id, data) {
    try {
      const user = await this.prisma.user.update({
        where: { id: Number(id) },
        data,
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async updateUserSubscriptionType(userId, subscriptionType) {
    try {
      console.log(
        `🔄 Updating user ${userId} subscription type to: ${subscriptionType}`
      );

      // Handle both BigInt and Number IDs
      const id = typeof userId === "bigint" ? Number(userId) : Number(userId);

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          subscriptionType: subscriptionType.toUpperCase(), // Ensure consistent casing
        },
      });

      console.log(
        `✅ User ${userId} subscription type updated to: ${updatedUser.subscriptionType}`
      );
      return this._decryptUser(updatedUser);
    } catch (error) {
      console.error("❌ Error updating user subscription type:", error);
      throw new Error(
        `Failed to update user subscription type: ${error.message}`
      );
    }
  }

  // Optional: Additional helper method for subscription management
  async getUserSubscriptionStatus(userId) {
    try {
      const id = typeof userId === "bigint" ? Number(userId) : Number(userId);

      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          subscriptionType: true,
          stripeCustomerId: true,
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
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error getting user subscription status:", error);
      throw error;
    }
  }
}
