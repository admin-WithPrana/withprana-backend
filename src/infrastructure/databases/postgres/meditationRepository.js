export class MeditationRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // async create(data) {
  //   return this.prisma.meditation.create({
  //     data: {
  //       title: data.title,
  //       description: data.description,
  //       duration: data.duration,
  //       link: data.link,
  //       thumbnail: data.thumbnail,
  //       isPremium: data.isPremium,
  //       type:data?.type,
  //       active: data.active !== undefined ? data.active : true,
  //       category: {
  //         connect: { id: data.categoryId }
  //       },
  //       ...(data.subcategoryId && {
  //         subcategory: {
  //           connect: { id: data.subcategoryId }
  //         }
  //       })
  //     },
  //     include: {
  //       category: true,
  //       subcategory: true,
  //     }
  //   });
  // }
  async create(data) {
  return this.prisma.meditation.create({
    data: {
      title: data.title,
      description: data.description,
      duration: data.duration,
      link: data.link,
      thumbnail: data.thumbnail,
      isPremium: data.isPremium,
      type: data?.type,
      active: data.active !== undefined ? data.active : true,
      category: {
        connect: { id: Number(data.categoryId) }
      },
      ...(data.subcategoryId && {
        subcategory: {
          connect: { id: data.subcategoryId }
        }
      }),
      ...(data.tags && data.tags.length > 0 && {
        meditationTags: {
          create: data.tags.map(tagId => ({
            tag: {
              connect: { id: tagId }
            }
          }))
        }
      })
    },
    include: {
      category: true,
      subcategory: true,
      meditationTags: {
        include: {
          tag: true
        }
      }
    }
  });
}

  async findById(id) {
    return this.prisma.meditation.findUnique({
      where: { id:id },
      include: {
        category: true,
        subcategory: true,
        meditationTags: {
        include: {
          tag: true
        }
      }
      },
    });
  }

  async getMeditationBySubCategoryId(id) {
    return this.prisma.meditation.findMany({
      where: { subcategoryId:id }
    });
  }

  async getMeditationByCategoryId(id) {
    return this.prisma.meditation.findMany({
      where: { categoryId:Number(id) }
    });
  }

  // async findAll() {
  //   return this.prisma.meditation.findMany({
  //     where: {
  //       isDeleted: false,
  //     },
  //     include: {
  //       category: true,
  //       subcategory: true,
  //     },
  //     orderBy: {
  //       createdAt: "desc",
  //     },
  //   });
  // }
//   async findAll() {
//   return this.prisma.meditation.findMany({
//     where: {
//       isDeleted: false,
//     },
//     include: {
//       category: true,
//       subcategory: true,
//       meditationTags: {
//         include: {
//           tag: true 
//         }
//       }
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// }
async findAll( limit = 10, page=1,sort,order) {
  const skip = (Number(page || 1) - 1) * Number(limit || 10);

  const [data, total] = await Promise.all([
    this.prisma.meditation.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
            [sort || "createdAt"]: order?.toLowerCase() === "asc" ? "asc" : "desc",
          },
      include: {
        category: true,
        subcategory: true,
        meditationTags: {
          include: {
            tag: true
          }
        }
      },
      take: Number(limit || 10),
      skip: Number(skip || 0),
    }),
    this.prisma.meditation.count({
      where: {
        isDeleted: false,
      },
    }),
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page || 1),
      limit: Number(limit || 10),
      totalPages: Math.ceil(total / (limit || 10)),
    },
  };
}

  async update(id, data) {
    const updateData = { ...data };
    console.log(data)
    if (data.categoryId !== undefined) {
      updateData.category = {
        connect: { id: Number(data.categoryId) }
      };
      delete updateData.categoryId;
    }
    
    if (data.subcategoryId !== undefined) {
      updateData.subcategory = {
        connect: { id: data.subcategoryId }
      };
      delete updateData.subcategoryId;
    }

    if(data.isPremium){
      updateData.isPremium=Boolean(data.isPremium)
    }

    return this.prisma.meditation.update({
      where: { id:id },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
      }
    });
  }

  async delete(id) {
    return this.prisma.meditation.update({
      where: { id: id },
      data: { isDeleted: true },
    });
  }
}