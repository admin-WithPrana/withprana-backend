export class PrismaUserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async create(user) {
    return this.prisma.user.create({ 
      data: {
        ...user,
        email: user.email.toLowerCase(),
      } 
    });
  }

  async verifyEmail(email) {
    return this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { 
        isVerified: true,
        active: true
      },
    });
  }

  async findAll({ signupMethod, subscriptionType, page, limit, sort, order }) {
    console.log(signupMethod,subscriptionType)
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
}

  

  async findById(id) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(id) }
    });
  
    if (!user) return null;
  
    return {
      ...user,
      id: user.id.toString(),
    };
  }
  

  async update(id, data) {
    const user = await this.prisma.user.update({
      where: { id: Number(id) },
      data
    });

    if (!user) return null;
  
    return {
      ...user,
      id: user.id.toString(),
    };
  }
}
