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
      where: { 
        email: email.toLowerCase() 
      },
      data: { 
        isVerified: true,
        active:true
      },
    });
  }
} 