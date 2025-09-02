export class MeditationUsecase {
  constructor(meditationRepository) {
    this.meditationRepository = meditationRepository;
  }

  async createMeditation({ 
    title, 
    description, 
    duration, 
    link, 
    thumbnail, 
    isPremium = false, 
    active = true, 
    categoryId, 
    subcategoryId = null,
    type,
    tags
  }) {
    console.log(tags)
    return this.meditationRepository.create({ 
      title, 
      description, 
      duration: Number(duration), 
      link, 
      thumbnail, 
      isPremium: Boolean(isPremium), 
      active: Boolean(active), 
      categoryId: categoryId, 
      subcategoryId,
      type:type,
      tags:tags
    });
  }

  async getMeditationById(id) {
    const meditation = await this.meditationRepository.findById(id);
    if (!meditation) throw new Error("Meditation not found");
    return meditation;
  }

  async getMeditationBySubCategoryId(id) {
    const meditation = await this.meditationRepository.getMeditationBySubCategoryId(id);
    if (!meditation) throw new Error("Meditation not found");
    return meditation;
  }

  async getMeditationByCategoryId(id) {
    const meditation = await this.meditationRepository.getMeditationByCategoryId(id);
    if (!meditation) throw new Error("Meditation not found");
    return meditation;
  }

  async getAllMeditations(limit,page,sort,order) {
    return this.meditationRepository.findAll(limit,page,sort,order);
  }

  async updateMeditation(id, data) {
    await this.getMeditationById(id);
    return this.meditationRepository.update(id, data);
  }

  async deleteMeditation(id) {
    await this.getMeditationById(id);
    return this.meditationRepository.delete(id);
  }

  async getMeditationsByCategory(categoryId) {
    return this.meditationRepository.findByCategory(categoryId);
  }

  async getMeditationsByDuration(minDuration, maxDuration) {
    return this.meditationRepository.findByDurationRange(minDuration, maxDuration);
  }

  async searchMeditations(query) {
    return this.meditationRepository.search(query);
  }

  async incrementPlayCount(id) {
    const meditation = await this.getMeditationById(id);
    return this.meditationRepository.update(id, { 
      playCount: (meditation.playCount || 0) + 1 
    });
  }

  async getPopularMeditations(limit = 10) {
    return this.meditationRepository.findMostPopular(limit);
  }
}