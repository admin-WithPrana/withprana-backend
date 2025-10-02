export class userTagsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async addUserTags(userId, tagIds) {
        try {
            const userIdBigInt = BigInt(userId);

            return await this.prisma.$transaction(async (tx) => {
                const existingUserTags = await tx.userTag.findMany({
                    where: {
                        userId: userIdBigInt,
                        tagId: { in: tagIds }
                    },
                    select: { tagId: true }
                });

                const existingTagIds = existingUserTags.map(ut => ut.tagId);
                const newTagIds = tagIds.filter(tagId => !existingTagIds.includes(tagId));

                // If all tags already exist, return the existing ones
                if (newTagIds.length === 0) {
                    return await tx.userTag.findMany({
                        where: {
                            userId: userIdBigInt,
                            tagId: { in: tagIds }
                        },
                        include: {
                            tag: true
                        }
                    });
                }

                // Create new user tags
                const userTagsData = newTagIds.map(tagId => ({
                    userId: userIdBigInt,
                    tagId: tagId
                }));

                await tx.userTag.createMany({
                    data: userTagsData,
                    skipDuplicates: true
                });

                // Return all user tags (both existing and new)
                return await tx.userTag.findMany({
                    where: {
                        userId: userIdBigInt,
                        tagId: { in: tagIds }
                    },
                    include: {
                        tag: true
                    }
                });
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return await this.getUserTags(userId, tagIds);
            }
            throw error;
        }
    }

    async getTagsByIds(tagIds) {
        return await this.prisma.tag.findMany({
            where: {
                id: { in: tagIds }
            }
        });
    }

    async getUserTags(userId, tagIds = null) {
        const whereClause = {
            userId: BigInt(userId)
        };

        if (tagIds) {
            whereClause.tagId = { in: tagIds };
        }

        return await this.prisma.userTag.findMany({
            where: whereClause,
            include: {
                tag: true
            }
        });
    }

    async removeUserTags(userId, tagIds) {
        const userIdBigInt = BigInt(userId);
        
        return await this.prisma.userTag.deleteMany({
            where: {
                userId: userIdBigInt,
                tagId: { in: tagIds }
            }
        });
    }

    async checkUserExists(userId) {
        try {
            const userIdBigInt = BigInt(userId);
            const user = await this.prisma.user.findUnique({
                where: { id: userIdBigInt },
                select: { id: true }
            });
            return !!user;
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    }

    async updateUserSubscriptionType(userId, subscriptionType) {
        return await this.prisma.user.update({
          where: { id: BigInt(userId) },
          data: { subscriptionType }
        });
      }
    
      async update(userId, data) {
        return await this.prisma.user.update({
          where: { id: BigInt(userId) },
          data
        });
      }
}