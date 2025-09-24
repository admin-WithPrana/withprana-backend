export class PolicyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return await this.prisma.policy.create({
      data: {
        type: data.type,
        content: data.content,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        active: data.active || false,
        isDeleted: false,
      },
    });
  }

  async update(id, data) {
    return await this.prisma.policy.update({
      where: { id },
      data: {
        ...data,
        ...(data.effectiveDate && { effectiveDate: new Date(data.effectiveDate) }),
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id) {
    return await this.prisma.policy.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id) {
    return await this.prisma.policy.findFirst({
      where: { 
        id,
        isDeleted: false 
      },
    });
  }

  async findByVersion(type) {
    return await this.prisma.policy.findFirst({
      where: { 
        isDeleted: false 
      },
    });
  }

  async findLatestActive(type) {
    return await this.prisma.policy.findFirst({
      where: { 
        type,
        isActive: true,
        isDeleted: false 
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findAll(filter = {}) {
    return await this.prisma.policy.findMany({
      where: { ...filter, isDeleted: false },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findAllPaginated(filter = {}, skip, take) {
    const [policies, totalCount] = await this.prisma.$transaction([
      this.prisma.policy.findMany({
        where: { ...filter, isDeleted: false },
        skip,
        take,
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.policy.count({ 
        where: { ...filter, isDeleted: false } 
      }),
    ]);

    return { policies, totalCount };
  }

  async deactivateOtherPolicies(type) {
    return await this.prisma.policy.updateMany({
      where: { 
        type,
        isActive: true,
        isDeleted: false 
      },
      data: { isActive: false },
    });
  }
}