export class OnboardingRepository {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async createQuestion(data) {
      return await this.prisma.onboardingQuestion.create({
        data: {
          question: data.question,
          active: data.active !== undefined ? data.active : true,
          options: {
            create: data.options.map(option => ({
              option: option.option,
              ...(Array.isArray(option.tags) && option.tags.length
                ? {
                    tags: {
                      create: option.tags.map(tagId => ({
                        tagId
                      }))
                    }
                  }
                : {})
            }))
          }
        },
        include: {
          options: {
            include: {
              tags: {
                include:{
                tag:true
                }
              }
            }
          }
        }
      });
    }
  
    async updateQuestion(id, data) {
      // First, delete existing options and their tags
      await this.prisma.onboardingOptionTag.deleteMany({
        where: { option: { questionId: id } }
      });
  
      await this.prisma.onboardingOption.deleteMany({
        where: { questionId: id }
      });
  
      // Then update the question with new options
      return await this.prisma.onboardingQuestion.update({
        where: { id },
        data: {
          question: data.question,
          active: data.active,
          options: {
            create: data.options.map(option => ({
              option: option.option,
              ...(Array.isArray(option.tags) && option.tags.length
                ? {
                    tags: {
                      create: option.tags.map(tagId => ({
                        tagId
                      }))
                    }
                  }
                : {})
            }))
          }
        },
        include: {
          options: {
            include: {
               tags: {
                include:{
                tag:true
                }
              }
            }
          }
        }
      });
    }
  
    async findQuestionById(id) {
      return await this.prisma.onboardingQuestion.findUnique({
        where: { id },
        include: {
          options: {
            include: {
              tags: true
            }
          }
        }
      });
    }
  
    async findAllQuestions(filter = {}) {
      return await this.prisma.onboardingQuestion.findMany({
        where: {
          ...filter,
          isDeleted: false
        },
        include: {
          options: {
            include: {
              tags: {
                include:{
                tag:true
                }
              }
            }
          }
        }
      });
    }
  
    async deleteQuestion(id) {
      return await this.prisma.onboardingQuestion.update({
        where: { id },
        data: { isDeleted: true }
      });
    }
  
    async getActiveQuestions() {
      return await this.prisma.onboardingQuestion.findMany({
        where: {
          active: true,
          isDeleted: false
        },
        include: {
          options: {
            where: { active: true, isDeleted: false },
            include: {
              tags: true
            }
          }
        }
      });
    }
  
    async saveUserResponse(userId, questionId, optionId) {
      return await this.prisma.onboardingResponse.upsert({
        where: {
          userId_questionId: {
            userId: BigInt(userId),
            questionId
          }
        },
        update: {
          optionId
        },
        create: {
          userId: BigInt(userId),
          questionId,
          optionId
        },
        include: {
          question: true,
          option: {
            include: {
              tags: true
            }
          }
        }
      });
    }
  
    async getUserResponses(userId) {
      return await this.prisma.onboardingResponse.findMany({
        where: { userId: BigInt(userId) },
        include: {
          question: true,
          option: {
            include: {
               tags: {
                include:{
                tag:true
                }
              }
            }
          }
        }
      });
    }
  
    async getRecommendedMeditations(userId, limit = 10) {
      const userResponses = await this.getUserResponses(userId);
      
      if (userResponses.length === 0) {
        return [];
      }

      const tagIds = userResponses.flatMap(response => 
        response.option.tags.map(tag => tag.tagId)
      );

      return await this.prisma.meditation.findMany({
        where: {
          active: true,
          isDeleted: false,
          meditationTags: {
            some: {
              tagId: { in: tagIds }
            }
          }
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
        take: limit,
        orderBy: {
          playCount: 'desc'
        }
      });
    }

    async getQuestionsPaginated(page = 1, limit = 10, filter = {}) {
      const skip = (page - 1) * limit;
      
      const [questions, totalCount] = await Promise.all([
        this.prisma.onboardingQuestion.findMany({
          where: {
            ...filter,
            isDeleted: false
          },
          include: {
            options: {
              include: {
                tags: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        this.prisma.onboardingQuestion.count({
          where: {
            ...filter,
            isDeleted: false
          }
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: questions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit
        }
      };
    }
  }