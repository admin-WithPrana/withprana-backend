import {
  decrypt,
  decryptDeterministic,
  encrypt,
  generateUserKey,
  encryptUserKey,
  decryptUserKey,
} from "../../../utils/encryption.js";

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

    try {
      if (decrypted.encryptedUserKey) {
        // New Flow: Decrypt userKey then decrypt data
        const userKey = decryptUserKey(decrypted.encryptedUserKey);
        if (decrypted.name) decrypted.name = decrypt(decrypted.name, userKey);
      } else {
        // Old Flow: Fallback to MASTER_KEY
        if (decrypted.name) decrypted.name = decrypt(decrypted.name);
      }
    } catch (error) {
      // If decryption fails, keep original or handle error
      console.error("Decryption failed for user:", user.id, error);
    }

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
      // Generate per-user key
      const userKey = generateUserKey();
      const encryptedUserKey = encryptUserKey(userKey);

      const newUser = await this.prisma.user.create({
        data: {
          image: user.image,
          signupMethod: user.signupMethod,
          subscriptionType: user.subscriptionType,
          email: user.email.toLowerCase(),
          name: user.name ? encrypt(user.name, userKey) : null, // Encrypt with userKey
          password: user.password,
          isVerified: user?.isVerified ?? false,
          active: user?.active ?? false,
          encryptedUserKey: encryptedUserKey, // Store the encrypted key
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
        data: users.map((user) => this._decryptUser({ ...user })),
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
        where: { id: id },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const updateData = { ...data };
      // Handle encryption if name is being updated
      if (updateData.name) {
        const user = await this.prisma.user.findUnique({
          where: { id: id },
        });
        if (user) {
          if (user.encryptedUserKey) {
            const userKey = decryptUserKey(user.encryptedUserKey);
            updateData.name = encrypt(updateData.name, userKey);
          } else {
            updateData.name = encrypt(updateData.name); // Fallback to Master Key
          }
        }
      }

      const user = await this.prisma.user.update({
        where: { id: id },
        data: updateData,
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async updateUser(id, data) {
    return this.update(id, data);
  }

  async updateUserSubscriptionType(userId, subscriptionType) {
    try {
      console.log(
        `🔄 Updating user ${userId} subscription type to: ${subscriptionType}`,
      );

      // Handle both BigInt and Number IDs
      const id = userId;

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          subscriptionType: subscriptionType.toUpperCase(), // Ensure consistent casing
        },
      });

      console.log(
        `✅ User ${userId} subscription type updated to: ${updatedUser.subscriptionType}`,
      );
      return this._decryptUser(updatedUser);
    } catch (error) {
      console.error("❌ Error updating user subscription type:", error);
      throw new Error(
        `Failed to update user subscription type: ${error.message}`,
      );
    }
  }

  // Optional: Additional helper method for subscription management
  async getUserSubscriptionStatus(userId) {
    try {
      const id = userId;

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
  async deleteUser(id) {
    try {
      // Prisma handles cascading deletes based on schema relation modes
      // Ensure the id is parsed correctly
      const parsedId = id;

      const user = await this.prisma.user.delete({
        where: { id: parsedId },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      await this.prisma.userLoginLog.upsert({
        where: { userId: userId },
        update: {
          lastLogin: new Date(),
          warningSent: false, // Reset warning flag on login
        },
        create: {
          userId: id,
          lastLogin: new Date(),
          warningSent: false,
        },
      });
      // console.log(`✅ Updated last login for user ${userId}`);
    } catch (error) {
      console.error("❌ Error updating last login:", error);
      // Non-blocking error
    }
  }

  async reactivateUser(userId) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          active: true,
          systemDeactivated: false,
        },
      });
      return this._decryptUser(user);
    } catch (error) {
      console.error("Error reactivating user:", error);
      throw error;
    }
  }
  async createRefreshToken({ token, userId, expiresAt }) {
    try {
      return await this.prisma.refreshToken.create({
        data: {
          token,
          userId: userId,
          expiresAt,
        },
      });
    } catch (error) {
      console.error("Error creating refresh token:", error);
      throw error;
    }
  }

  async findRefreshToken(token) {
    try {
      return await this.prisma.refreshToken.findUnique({
        where: { token },
      });
    } catch (error) {
      console.error("Error finding refresh token:", error);
      throw error;
    }
  }

  async revokeRefreshToken(id) {
    try {
      return await this.prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
      });
    } catch (error) {
      console.error("Error revoking refresh token:", error);
      throw error;
    }
  }
}
