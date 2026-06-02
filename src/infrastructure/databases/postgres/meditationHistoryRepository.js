export class MeditationWatchHistoryRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async create(data) {
        return this.prisma.meditationWatchHistory.create({
            data,
        });
    }

    async findById(id) {
        return this.prisma.meditationWatchHistory.findUnique({
            where: { id },
        });
    }

    async findByUserId(userId) {
        return this.prisma.meditationWatchHistory.findMany({
            where: { userId },
            include: {
                meditation: true,
            },
            orderBy: { watchedAt: 'desc' },
        });
    }

    async findByUserAndMeditation(userId, meditationId) {
        return this.prisma.meditationWatchHistory.findMany({
            where: { userId, meditationId },
            orderBy: { watchedAt: 'desc' },
        });
    }

    async findRecentWithMeditation(userId, limit = 5, skip = 0) {
        return this.prisma.meditationWatchHistory.findMany({
            where: { userId },
            orderBy: { watchedAt: 'desc' },
            include: {
                meditation: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        subcategory: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            take: limit,
            skip,
        });
    }

    async update(id, data) {
        return this.prisma.meditationWatchHistory.update({
            where: { id },
            data,
        });
    }

    async delete(id) {
        return this.prisma.meditationWatchHistory.delete({
            where: { id },
        });
    }
}

