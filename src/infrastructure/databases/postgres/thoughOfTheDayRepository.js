export class ThoughtOfTheDayRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Create new or reposted thought
  async create(data) {
    return this.prisma.thoughtOfTheDay.create({ data });
  }

  // Get a thought by ID
  async findById(id) {
    return this.prisma.thoughtOfTheDay.findUnique({
      where: { id },
    });
  }

  // Update status (e.g., to POSTED)
  async updateStatus(id, status) {
    return this.prisma.thoughtOfTheDay.update({
      where: { id },
      data: { status },
    });
  }

  // Fetch all thoughts by filters (e.g., status)
  async findAll({ status = null, limit = null, skip = null }) {
    return this.prisma.thoughtOfTheDay.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      ...(limit && { take: Number(limit) }),
      ...(skip && { skip: Number(skip) }),
    });
  }

}
