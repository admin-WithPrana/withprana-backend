export class MeditationRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.meditation.create({
      data: {
        title: data.title,
        description: data.description,
        duration: data.duration,
        link: data.link,
        thumbnail: data.thumbnail,
        isPremium: data.isPremium,
        active: data.active !== undefined ? data.active : true,
        category: {
          connect: { id: data.categoryId }
        },
        ...(data.subcategoryId && {
          subcategory: {
            connect: { id: data.subcategoryId }
          }
        })
      },
      include: {
        category: true,
        subcategory: true,
      }
    });
  }

  async findById(id) {
    return this.prisma.meditation.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        subcategory: true,
      },
    });
  }

  async findAll() {
    return this.prisma.meditation.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        category: true,
        subcategory: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(id, data) {
    const updateData = { ...data };
    
    if (data.categoryId !== undefined) {
      updateData.category = {
        connect: { id: Number(data.categoryId) }
      };
      delete updateData.categoryId;
    }
    
    if (data.subcategoryId !== undefined) {
      updateData.subcategory = {
        connect: { id: Number(data.subcategoryId) }
      };
      delete updateData.subcategoryId;
    }

    return this.prisma.meditation.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
      }
    });
  }

  async delete(id) {
    return this.prisma.meditation.update({
      where: { id: Number(id) },
      data: { isDeleted: true },
    });
  }
}