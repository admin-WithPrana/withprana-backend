export class MeditationWatchHistoryController {
    constructor(meditationWatchHistoryUsecase) {
        this.meditationWatchHistoryUsecase = meditationWatchHistoryUsecase;
    }

    async addWatchHistory(request, reply) {
        try {
            const { userId, meditationId, watchedSeconds, completed, device } = request.body;

            const history = await this.meditationWatchHistoryUsecase.addWatchHistory({
                userId,
                meditationId,
                watchedSeconds,
                completed,
                device
            });

            return reply.send({ success: true, history });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error adding watch history' });
        }
    }

    async getUserHistory(request, reply) {
        try {
            const { userId } = request.params;

            const history = await this.meditationWatchHistoryUsecase.getUserHistory(userId);

            return reply.send({ success: true, history });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error fetching watch history' });
        }
    }

    async getUserMeditationHistory(request, reply) {
        try {
            const { userId, meditationId } = request.params;

            const history =
                await this.meditationWatchHistoryUsecase.getUserMeditationHistory(
                    userId,
                    meditationId
                );

            return reply.send({ success: true, history });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error fetching meditation history' });
        }
    }

    async markCompleted(request, reply) {
        try {
            const { id } = request.params;

            const history = await this.meditationWatchHistoryUsecase.markCompleted(id);

            return reply.send({
                success: true,
                message: 'Meditation marked as completed',
                history
            });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error updating completion status' });
        }
    }

    async updateWatchedSeconds(request, reply) {
        try {
            const { id } = request.params;
            const { watchedSeconds } = request.body;

            const history =
                await this.meditationWatchHistoryUsecase.updateWatchedSeconds(
                    id,
                    watchedSeconds
                );

            return reply.send({ success: true, history });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error updating watched seconds' });
        }
    }

    async deleteHistory(request, reply) {
        try {
            const { id } = request.params;

            await this.meditationWatchHistoryUsecase.deleteHistory(id);

            return reply.send({
                success: true,
                message: 'Watch history deleted'
            });
        } catch (error) {
            console.error(error);
            return reply
                .status(500)
                .send({ success: false, message: 'Error deleting watch history' });
        }
    }
}
