export class ThoughtOfTheDayController {
  constructor(thoughtUsecase) {
    this.thoughtUsecase = thoughtUsecase;
  }

  // POST /thoughts
  async createThought(request, reply) {
    try {
      const data = request.body;

      const thought = await this.thoughtUsecase.createThought(data);

      return reply.send({
        success: true,
        message: 'Thought created successfully',
        thought,
      });
    } catch (error) {
      console.error('Error in createThought:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to create thought',
        error: error.message || error,
      });
    }
  }

  // POST /thoughts/repost
  async repostThought(request, reply) {
    try {
      const { originalId, newScheduledAt } = request.body;

      if (!originalId || !newScheduledAt) {
        return reply.status(400).send({
          success: false,
          message: 'Missing originalId or newScheduledAt',
        });
      }

      const reposted = await this.thoughtUsecase.repostThought(originalId, newScheduledAt);

      return reply.send({
        success: true,
        message: 'Thought reposted successfully',
        reposted,
      });
    } catch (error) {
      console.error('Error in repostThought:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to repost thought',
        error: error.message || error,
      });
    }
  }

  // GET /thoughts
  async getThoughts(request, reply) {
    try {
      const { status, limit, skip } = request.query;

      const thoughts = await this.thoughtUsecase.getThoughts({ status, limit, skip });

      return reply.send({
        success: true,
        thoughts,
      });
    } catch (error) {
      console.error('Error in getThoughts:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get thoughts',
        error: error.message || error,
      });
    }
  }

  // PATCH /thoughts/:id/mark-posted
  async markAsPosted(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        return reply.status(400).send({
          success: false,
          message: 'Missing thought ID in params',
        });
      }

      const result = await this.thoughtUsecase.markAsPosted(id);

      return reply.send({
        success: true,
        message: 'Thought marked as posted',
        result,
      });
    } catch (error) {
      console.error('Error in markAsPosted:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update post status',
        error: error.message || error,
      });
    }
  }
}
