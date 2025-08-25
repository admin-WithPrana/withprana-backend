export class TagRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async create(data) {
        return this.prisma.tag.create({ 
            data: {
                name: data.name,
            },
        });
    }

    async findAll() {
        return this.prisma.tag.findMany({
            where: {
                active: true,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async findByNameAndCategory(name, categoryId) {
        return this.prisma.tag.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                },
                categoryId,
                active: true,
                isDeleted: false
            },
            include: {
                category: true
            }
        });
    }
}
