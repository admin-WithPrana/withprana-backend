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

    async update(id, data) {
        return this.prisma.meditationWatchHistory.update({
            where: { id },
            data,
        });
    }

    async delete (id) {
        return this.prisma.meditationWatchHistory.delete({
            where: { id },
        });
    }
}

