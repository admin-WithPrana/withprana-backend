export class PrismaUserRepository {
  constructor(prisma) {
    if (!prisma) {
      throw new Error('Prisma client is required');
    }
    this.prisma = prisma;
  }

  async findByEmail(email) {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // async createUser(user) {
  //   try {
  //      await this.prisma.user.create({ 
  //       data: {
  //         image: user.image,
  //         signupMethod: user.signupMethod,
  //         subscriptionType: user.subscriptionType,
  //         email: user.email.toLowerCase(),
  //         name: user.name,
  //         password: user.password,
  //         isVerified: user?.isVerified || false ,
  //         active: user?.active || false
  //       } 
  //     });
  //   } catch (error) {
  //     console.error('Error creating user:', error);
  //     throw error;
  //   }
  // }
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
  
      return newUser; 
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  

  async verifyEmail(email) {
    try {
      return await this.prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { 
          isVerified: true,
          active: true
        },
      });
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  async findAll({ signupMethod, subscriptionType, page = 1, limit = 10, sort, order } = {}) {
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
        })
      });

      const total = await this.prisma.user.count({ where });

      return {
        data: users.map((user) => ({ ...user, id: Number(user.id) })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return await this.prisma.user.findUnique({
        where: { id: Number(id) }
      });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      return await this.prisma.user.update({
        where: { id: Number(id) },
        data
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateUser(id, data) {
    try {
      return await this.prisma.user.update({
        where: { id: Number(id) },
        data
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}