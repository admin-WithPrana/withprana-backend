export class SubcategoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.subcategory.create({
      data: {
        name: data.name,
        color: data?.color || null,
        categoryId: data.categoryId,
        active: data.active !== undefined ? data.active : true,
        isDeleted: data.isDeleted !== undefined ? data.isDeleted : false,
      },
      include: {
        category: true,
        meditations: {
          where: {
            active: true,
            isDeleted: false,
          },
        },
      },
    });
  }

  async findById(id, userId) {
    const include = {
      category: true,
      meditations: {
        where: {
          active: true,
          isDeleted: false,
        },
        include: {
          // Include likedUsers for each meditation if userId is provided
          ...(userId && {
            likedUsers: {
              where: { userId: userId },
              select: { id: true },
            },
          }),
        },
      },
    };

    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include,
    });

    if (subcategory && subcategory.meditations) {
      // Map meditations to add isLiked field based on likedUsers presence
      subcategory.meditations = subcategory.meditations.map((meditation) => {
        const isLiked = userId
          ? meditation.likedUsers && meditation.likedUsers.length > 0
          : false;
        // Remove likedUsers from the response to keep it clean
        if (meditation.likedUsers) delete meditation.likedUsers;

        return {
          ...meditation,
          isLiked,
        };
      });
    }

    // Removed subcategory.isLiked logic as requested

    return subcategory;
  }

  async findAll(categoryId) {
    return this.prisma.subcategory.findMany({
      where: {
        active: true,
        isDeleted: false,
        categoryId: categoryId,
      },
      include: {
        category: true,
        _count: {
          select: {
            meditations: {
              where: {
                active: true,
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(id, data) {
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        meditations: {
          where: {
            active: true,
            isDeleted: false,
          },
        },
      },
    });
  }

  async delete(id) {
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        isDeleted: true,
        active: false,
        updatedAt: new Date(),
      },
    });
  }

  async findByName(name) {
    return this.prisma.subcategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        active: true,
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });
  }

  async findByActiveStatus(active) {
    return this.prisma.subcategory.findMany({
      where: {
        active: active,
        isDeleted: false,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async restore(id) {
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        isDeleted: false,
        active: true,
        updatedAt: new Date(),
      },
    });
  }

  async findByNameAndCategory(name, categoryId) {
    return this.prisma.subcategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        categoryId,
        active: true,
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });
  }
}
