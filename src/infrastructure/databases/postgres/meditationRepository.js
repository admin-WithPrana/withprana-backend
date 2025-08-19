export class MeditationRepository {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async create(data) {
      return this.prisma.category.create({ data });
    }
  
    async findById(id) {
      return this.prisma.category.findUnique({ where: { id } });
    }
  
    async findAll() {
        return this.prisma.category.findMany({
          where: {
            active: true,
            isDeleted: false,
          },
        });
      }      
  
    async update(id, data) {
      return this.prisma.category.update({
        where: { id },
        data,
      });
    }
  
    async delete(id) {
      return this.prisma.category.update({ where: { id },data: { isDeleted: true }});
    }
  }  