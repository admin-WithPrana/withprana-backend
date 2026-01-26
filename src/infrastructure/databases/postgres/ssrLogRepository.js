export class SARLogRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async createLog({ userId, status }) {
        return this.prisma.sARLogRequest.create({
            data: {
                userId,
                status,
            },
        });
    }

    async findById(id) {
        return this.prisma.sARLogRequest.findUnique({
            where: { id },
            include: { user: true },
        });
    }

    async findByUserId(userId) {
        return this.prisma.sARLogRequest.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }

    async updateStatus(id, status) {
        return this.prisma.sARLogRequest.update({
            where: { id },
            data: { status },
        });
    }

    async deleteLog(id) {
        return this.prisma.sARLogRequest.delete({
            where: { id },
        });
    }
}
