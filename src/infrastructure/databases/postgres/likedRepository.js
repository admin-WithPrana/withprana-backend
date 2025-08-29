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

  async getLikedMeditations(userId, categoryId = null, type = null, limit = null,skip=null) {
  return this.prisma.liked.findMany({
  where: {
    userId,
    meditation: {
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...(type && { type }),
    },
  },
  include: {
    meditation: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
  ...(limit && { take: Number(limit) }),
  ...(skip && { skip: Number(skip) }),
});
}
}
