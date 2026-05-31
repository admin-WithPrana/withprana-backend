import { pushQueue } from "../../config/bullmq.js";

export class MeditationUsecase {
  constructor(
    meditationRepository,
    meditationWatchHistoryRepository,
    meditationQueue,
  ) {
    this.meditationRepository = meditationRepository;
    this.meditationWatchHistoryRepository = meditationWatchHistoryRepository;
    this.meditationQueue = meditationQueue;
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
    tags,
    scheduledAt,
  }) {
    const meditation = await this.meditationRepository.create({
      title,
      description,
      duration: Number(duration),
      link,
      thumbnail,
      isPremium: Boolean(isPremium),
      active: Boolean(active),
      categoryId: categoryId,
      subcategoryId,
      type: type,
      tags: tags,
      scheduledAt,
    });

    if (meditation.scheduledAt) {
      await this.meditationQueue.add(
        "meditationQueue",
        { meditationId: meditation.id },
        {
          delay: new Date(meditation.scheduledAt).getTime() - Date.now(),
          attempts: 3, // retry if job fails
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } else if (meditation.active) {
      // Immediate release: Dispatch broadcast Push Notification
      await pushQueue.add("newMeditationPush", {
        title: "New Meditation Released!",
        message: `"${meditation.title}" is now available to listen to.`,
        imageUrl: meditation.thumbnail,
        sendToAllSubscribed: false // Dispatch scalable chunked customer database notifications via bull worker
      });
    }

    return meditation;
  }

  async getMeditationById(id, user) {
    const meditation = await this.meditationRepository.findById(id, user?.id);
    if (!meditation) throw new Error("Meditation not found");
    if (user?.role == "USER") {
      const watchHistory = await this.meditationWatchHistoryRepository.create({
        userId: user.id,
        meditationId: meditation.id,
        watchedSeconds: 0,
        completed: false,
        device: user.device || null,
        watchedAt: new Date(),
      });

      return {
        meditation,
        watchHistory,
      };
    }
    return meditation;
  }

  async getMeditationBySubCategoryId(id, user) {
    const meditation =
      await this.meditationRepository.getMeditationBySubCategoryId(
        id,
        user?.id,
      );
    if (!meditation) throw new Error("Meditation not found");
    return meditation;
  }

  async getMeditationByCategoryId(id) {
    const meditation =
      await this.meditationRepository.getMeditationByCategoryId(id);
    if (!meditation) throw new Error("Meditation not found");
    return meditation;
  }

  async getAllMeditations(limit, page, sort, order, search, isPremium, categoryId) {
    return this.meditationRepository.findAll(limit, page, sort, order, search, isPremium, categoryId);
  }

  async getMeditationsByUserSelectedTags(userId, limit, page, sort, order) {
    if (!userId) {
      throw new Error("User authentication required");
    }
    return this.meditationRepository.findByUserSelectedTags(
      userId,
      limit,
      page,
      sort,
      order,
    );
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
    return this.meditationRepository.findByDurationRange(
      minDuration,
      maxDuration,
    );
  }

  async searchMeditations(query) {
    return this.meditationRepository.search(query);
  }

  async incrementPlayCount(id) {
    const meditation = await this.getMeditationById(id);
    return this.meditationRepository.update(id, {
      playCount: (meditation.playCount || 0) + 1,
    });
  }

  async updateMeditationTime(id, data) {
    return this.meditationWatchHistoryRepository.update(id, data);
  }
  async getWatchHistory(userId) {
    return this.meditationWatchHistoryRepository.findByUserId(userId);
  }

  async getPopularMeditations(limit = 10) {
    return this.meditationRepository.findMostPopular(limit);
  }

  async getMeditationsByTagId(tagId, user) {
    return this.meditationRepository.findByTagId(tagId, user?.id);
  }
}
