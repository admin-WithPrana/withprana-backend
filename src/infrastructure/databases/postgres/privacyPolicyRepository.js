export class PolicyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return await this.prisma.policy.create({
      data: {
        type: data.type,
        content: data.content,
        active: data.active || true,
        isDeleted: false,
      },
    });
  }

  async update(type,data) {
    return await this.prisma.policy.update({
      where: { type },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async findByType(type) {
    return await this.prisma.policy.findFirst({
      where: {
        type,
        active: true,
        isDeleted: false,
      }
    });
  }
  
}