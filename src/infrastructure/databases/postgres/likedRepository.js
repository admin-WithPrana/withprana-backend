export class LikedRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async likeMeditation(userId, meditationId) {
    return this.prisma.liked.upsert({
      where: {
        userId_meditationId: {
          userId,
          meditationId,
        },
      },
      update: {}, 
      create: {
        userId,
        meditationId,
      },
    });
  }

  async dislikeMeditation(userId, meditationId) {
    return this.prisma.liked.delete({
      where: {
        userId_meditationId: {
          userId,
          meditationId,
        },
      },
    });
  }

  async getLikedMeditations(userId,categoryId) {
    return this.prisma.liked.findMany({
      where: { userId,meditation: categoryId ? { categoryId: Number(categoryId) } : {} },
      include: {
        meditation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
