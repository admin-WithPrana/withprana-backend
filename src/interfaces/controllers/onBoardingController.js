export class OnboardingController {
    constructor(usecase) {
      this.usecase = usecase;
    }
  
    async createQuestion(req, reply) {
      try {
        const question = await this.usecase.createQuestion(req.body);
        
        return reply.code(201).send({
          message: "Onboarding question created successfully",
          data: question,
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async updateQuestion(req, reply) {
      try {
        const { id } = req.params;
        const question = await this.usecase.updateQuestion(id, req.body);
        
        return reply.code(200).send({
          message: "Onboarding question updated successfully",
          data: question,
        });
      } catch (err) {
        if (err.message.includes('not found')) {
          return reply.code(404).send({ 
            error: "Not Found",
            message: err.message 
          });
        }
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async getQuestionById(req, reply) {
      try {
        const { id } = req.params;
        const question = await this.usecase.getQuestionById(id);
        
        return reply.code(200).send({
          message: "Question fetched successfully",
          data: question,
        });
      } catch (err) {
        if (err.message.includes('not found')) {
          return reply.code(404).send({ 
            error: "Not Found",
            message: err.message 
          });
        }
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async getAllQuestions(req, reply) {
      try {
        const { active } = req.query;
        const filter = {};
        
        if (active !== undefined) {
          filter.active = active === 'true';
        }
        
        const questions = active === 'true' 
          ? await this.usecase.getActiveQuestions()
          : await this.usecase.getAllQuestions(filter);
        
        return reply.code(200).send({
          message: "Questions fetched successfully",
          data: questions,
          count: questions.length
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async deleteQuestion(req, reply) {
      try {
        const { id } = req.params;
        await this.usecase.deleteQuestion(id);
        
        return reply.code(200).send({ 
          message: "Question deleted successfully" 
        });
      } catch (err) {
        if (err.message.includes('not found')) {
          return reply.code(404).send({ 
            error: "Not Found",
            message: err.message 
          });
        }
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async saveResponse(req, reply) {
      try {
        const { userId } = req.params;
        const { questionId, optionId } = req.body;
        
        const response = await this.usecase.saveUserResponse(userId, questionId, optionId);
        
        return reply.code(201).send({
          message: "Response saved successfully",
          data: response,
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async getUserResponses(req, reply) {
      try {
        const { userId } = req.params;
        const responses = await this.usecase.getUserResponses(userId);
        
        return reply.code(200).send({
          message: "User responses fetched successfully",
          data: responses,
          count: responses.length
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  
    async getRecommendations(req, reply) {
      try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;
        
        const meditations = await this.usecase.getRecommendedMeditations(
          userId, 
          parseInt(limit)
        );
        
        return reply.code(200).send({
          message: "Recommended meditations fetched successfully",
          data: meditations,
          count: meditations.length
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }

    async getQuestionsPaginated(req, reply) {
      try {
        const { page = 1, limit = 10, active } = req.query;
        
        const filter = {};
        if (active !== undefined) {
          filter.active = active === 'true';
        }
        
        const result = await this.usecase.getQuestionsPaginated(
          parseInt(page), 
          parseInt(limit), 
          filter
        );
        
        return reply.code(200).send({
          message: "Questions fetched successfully",
          data: result.data,
          pagination: result.pagination
        });
      } catch (err) {
        return reply.code(400).send({ 
          error: "Bad Request",
          message: err.message 
        });
      }
    }
  }