export class MeditationWatchHistoryUsecase {
    constructor(meditationWatchHistoryRepository) {
        this.repository = meditationWatchHistoryRepository;
    }

    async addWatchHistory({ userId, meditationId, watchedSeconds, completed = false, device }) {
        return this.repository.create({
            userId,
            meditationId,
            watchedSeconds,
            completed,
            device,
            watchedAt: new Date()
        });
    }

    async getUserHistory(userId) {
        return this.repository.findByUserId(userId);
    }

    async getUserMeditationHistory(userId, meditationId) {
        return this.repository.findByUserAndMeditation(userId, meditationId);
    }

    async markCompleted(id) {
        return this.repository.update(id, { completed: true });
    }

    async updateWatchedSeconds(id, watchedSeconds) {
        return this.repository.update(id, { watchedSeconds });
    }

    async deleteHistory(id) {
        return this.repository.delete(id);
    }
}
