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
async findAll() {
  const result = await this.prisma.meditation.findMany({
    where: {
      isDeleted: false,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Debug: Check what's actually being returned
  console.log('🔍 Meditation Tags Debug:');
  result.forEach((meditation, index) => {
    console.log(`Meditation ${index + 1}: ${meditation.title}`);
    console.log(`Tags count: ${meditation.meditationTags.length}`);
    meditation.meditationTags.forEach(tagRel => {
      console.log(`- Tag: ${tagRel.tag.name} (ID: ${tagRel.tag.id})`);
    });
  });

  return result;
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
        connect: { id: data.subcategoryId }
      };
      delete updateData.subcategoryId;
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