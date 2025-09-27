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

  // async findByUserSelectedTags(userId, limit = 10, page = 1, sort, order) {
  //   const userIdBigInt = BigInt(userId);
  //   const skip = (Number(page || 1) - 1) * Number(limit || 10);

  //   // Fetch the user's selected tag IDs
  //   const userTags = await this.prisma.userTag.findMany({
  //     where: { userId: userIdBigInt },
  //     select: { tagId: true }
  //   });

  //   const tagIds = userTags.map(ut => ut.tagId);

  //   if (tagIds.length === 0) {
  //     return {
  //       data: [],
  //       pagination: {
  //         total: 0,
  //         page: Number(page || 1),
  //         limit: Number(limit || 10),
  //         totalPages: 0,
  //       },
  //     };
  //   }

  //   const [data, total] = await Promise.all([
  //     this.prisma.meditation.findMany({
  //       where: {
  //         isDeleted: false,
  //         meditationTags: {
  //           some: { tagId: { in: tagIds } }
  //         }
  //       },
  //       include: {
  //         category: true,
  //         subcategory: true,
  //         // meditationTags: { include: { tag: true } },
  //         likedUsers: {
  //           where: {
  //             userId: userIdBigInt
  //           },
  //           select: {
  //             id: true
  //           }
  //         }
  //       },
  //       orderBy: {
  //         [sort || "createdAt"]: order?.toLowerCase() === "asc" ? "asc" : "desc",
  //       },
  //       take: Number(limit || 10),
  //       skip: Number(skip || 0),
  //     }),
  //     this.prisma.meditation.count({
  //       where: {
  //         isDeleted: false,
  //         meditationTags: {
  //           some: { tagId: { in: tagIds } }
  //         }
  //       },
  //     }),
  //   ]);

  //   // Transform the data to include isLiked field
  //   const transformedData = data.map(meditation => ({
  //     ...meditation,
  //     isLiked: meditation.likedUsers.length > 0
  //   }));

  //   return {
  //     data: transformedData,
  //     pagination: {
  //       total,
  //       page: Number(page || 1),
  //       limit: Number(limit || 10),
  //       totalPages: Math.ceil(total / (limit || 10)),
  //     },
  //   };
  // }
  async findByUserSelectedTags(userId, limit = 10, page = 1, sort, order) {
    try {
      console.log('Method called with:', { userId, limit, page, sort, order });
  
      const userIdBigInt = BigInt(userId);
      const skip = (Number(page || 1) - 1) * Number(limit || 10);
  
      // Fetch the user's selected tag IDs
      console.log('Fetching user tags...');
      const userTags = await this.prisma.userTag.findMany({
        where: { userId: userIdBigInt },
        select: { tagId: true }
      });
      console.log('User tags found:', userTags.length);
  
      const tagIds = userTags.map(ut => ut.tagId);
      console.log('Tag IDs:', tagIds);
  
      if (tagIds.length === 0) {
        console.log('No tags found for user');
        return {
          data: [],
          pagination: {
            total: 0,
            page: Number(page || 1),
            limit: Number(limit || 10),
            totalPages: 0,
          },
        };
      }
  
      console.log('Executing parallel queries...');
      const [data, total] = await Promise.all([
        this.prisma.meditation.findMany({
          where: {
            isDeleted: false,
            meditationTags: {
              some: { tagId: { in: tagIds } }
            }
          },
          include: {
            category: true,
            subcategory: true,
            likedUsers: {
              where: {
                userId: userIdBigInt
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            [sort || "createdAt"]: order?.toLowerCase() === "asc" ? "asc" : "desc",
          },
          take: Number(limit || 10),
          skip: Number(skip || 0),
        }),
        this.prisma.meditation.count({
          where: {
            isDeleted: false,
            meditationTags: {
              some: { tagId: { in: tagIds } }
            }
          },
        }),
      ]);
  
      console.log('Data found:', data.length);
      console.log('Total count:', total);
  
      // Transform the data to include isLiked field
      const transformedData = data.map(meditation => ({
        ...meditation,
        isLiked: meditation.likedUsers.length > 0
      }));
  
      return {
        data: transformedData,
        pagination: {
          total,
          page: Number(page || 1),
          limit: Number(limit || 10),
          totalPages: Math.ceil(total / (limit || 10)),
        },
      };
    } catch (error) {
      console.error('Error in findByUserSelectedTags:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }
  
}