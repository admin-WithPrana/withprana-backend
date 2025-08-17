export class AuthRepository {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async findByEmail(email) {
      return this.prisma.admin.findUnique({
        where: { email },
      });
    }
  }
  