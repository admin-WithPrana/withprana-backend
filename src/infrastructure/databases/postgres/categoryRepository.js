export class CategoryRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async create(data) {
        return this.prisma.category.create({ 
            data: {
                name: data.name,
                backgroundImage: data.backgroundImage || null,
                icon: data.icon || null,
                active: data.active !== undefined ? data.active : true,
                isDeleted: data.isDeleted !== undefined ? data.isDeleted : false,
                color:data?.color
            }
        });
    }

    async findById(id) {
        return this.prisma.category.findUnique({ 
            where: { id },
            include: {
                meditations: {
                    where: {
                        active: true,
                        isDeleted: false
                    }
                },
                subcategories: {
                    where: {
                        active: true,
                        isDeleted: false
                    }
                }
            }
        });
    }

    async findAll() {
        return this.prisma.category.findMany({
            where: {
                active: true,
                isDeleted: false,
            },
            include: {
                _count: {
                    select: {
                        meditations: {
                            where: {
                                active: true,
                                isDeleted: false
                            }
                        },
                        subcategories: {
                            where: {
                                active: true,
                                isDeleted: false
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async update(id, data) {
        return this.prisma.category.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            },
            include: {
                meditations: {
                    where: {
                        active: true,
                        isDeleted: false
                    }
                },
                subcategories: {
                    where: {
                        active: true,
                        isDeleted: false
                    }
                }
            }
        });
    }

    async delete(id) {
        return this.prisma.category.update({ 
            where: { id },
            data: { 
                isDeleted: true,
                active: false,
                updatedAt: new Date()
            }
        });
    }

    async findByName(name) {
        return this.prisma.category.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                },
                active: true,
                isDeleted: false
            }
        });
    }

    async findByActiveStatus(active) {
        return this.prisma.category.findMany({
            where: {
                active: active,
                isDeleted: false
            },
            orderBy: {
                name: 'asc'
            }
        });
    }

    async restore(id) {
        return this.prisma.category.update({
            where: { id },
            data: {
                isDeleted: false,
                active: true,
                updatedAt: new Date()
            }
        });
    }
}