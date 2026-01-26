export class SARLogController {
    constructor(sarLogUseCases) {
        this.sarLogUseCases = sarLogUseCases;
    }
    // Queue a SAR log for a user
    async createLog(request, reply) {
        try {
            const { userId, status } = request.body;
            const result = await this.sarLogUseCases.createLog({ userId, status });
            reply.send(result);
        } catch (error) {
            console.error(error);
            reply.status(400).send({ success: false, message: error.message });
        }
    }

    // Get last 30 days SAR logs for a user
    async getLast30DaysLogs(request, reply) {
        try {
            const { userId } = request.params;
            if (!userId) {
                return reply.status(400).send({ success: false, message: "User ID is required" });
            }

            const logs = await this.sarLogUseCases.getLast30DaysLogs(userId);
            reply.send({ success: true, logs });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ success: false, message: "Failed to fetch logs" });
        }
    }
}
