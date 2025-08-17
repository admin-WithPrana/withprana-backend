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

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(user => ({
      ...user,
      id: Number(user.id)
    }));
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
