export class MeditationUsecase {
    constructor(categoryRepository) {
      this.categoryRepository = categoryRepository;
    }
  
    async createCategory({ name}) {
      return this.categoryRepository.create({ name });
    }
  
    async getCategoryById(id) {
      const category = await this.categoryRepository.findById(id);
      if (!category) throw new Error("Category not found");
      return category;
    }
  
    async getAllCategories() {
      return this.categoryRepository.findAll();
    }
  
    async updateCategory(id, data) {
      await this.getCategoryById(id);
      return this.categoryRepository.update(id, data);
    }
  
    async deleteCategory(id) {
      await this.getCategoryById(id);
      return this.categoryRepository.delete(id);
    }
  }
  