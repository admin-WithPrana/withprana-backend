export class OnboardingUsecase {
    constructor(repo) {
      this.repo = repo;
    }
  
    async createQuestion(data) {
      try {
        if (!data.question || !data.options || !Array.isArray(data.options)) {
          throw new Error('Question and options are required');
        }
 
        data.options.forEach((option, index) => {
          if (!option.option || !option.tags || !Array.isArray(option.tags)) {
            throw new Error(`Option ${index + 1} must have option and tags array`);
          }
        });
  
        return await this.repo.createQuestion(data);
      } catch (err) {
        throw new Error(`Usecase Error (createQuestion): ${err.message}`);
      }
    }
  
    async updateQuestion(id, data) {
      try {
        if (!id) throw new Error('Question ID is required');

        if (!data.question || !data.options || !Array.isArray(data.options)) {
          throw new Error('Question and options are required');
        }
  
        return await this.repo.updateQuestion(id, data);
      } catch (err) {
        throw new Error(`Usecase Error (updateQuestion): ${err.message}`);
      }
    }
  
    async getQuestionById(id) {
      try {
        if (!id) throw new Error('Question ID is required');
        
        const question = await this.repo.findQuestionById(id);
        if (!question) {
          throw new Error('Question not found');
        }
        return question;
      } catch (err) {
        throw new Error(`Usecase Error (getQuestionById): ${err.message}`);
      }
    }
  
    async getAllQuestions(filter = {}) {
      try {
        return await this.repo.findAllQuestions(filter);
      } catch (err) {
        throw new Error(`Usecase Error (getAllQuestions): ${err.message}`);
      }
    }
  
    async getActiveQuestions() {
      try {
        return await this.repo.getActiveQuestions();
      } catch (err) {
        throw new Error(`Usecase Error (getActiveQuestions): ${err.message}`);
      }
    }
  
    async deleteQuestion(id) {
      try {
        if (!id) throw new Error('Question ID is required');
        
        const question = await this.repo.findQuestionById(id);
        if (!question) {
          throw new Error('Question not found');
        }
        
        return await this.repo.deleteQuestion(id);
      } catch (err) {
        throw new Error(`Usecase Error (deleteQuestion): ${err.message}`);
      }
    }
  
    async saveUserResponse(userId, questionId, optionId) {
      try {
        if (!userId || !questionId || !optionId) {
          throw new Error('User ID, Question ID, and Option ID are required');
        }
  
        return await this.repo.saveUserResponse(userId, questionId, optionId);
      } catch (err) {
        throw new Error(`Usecase Error (saveUserResponse): ${err.message}`);
      }
    }
  
    async getUserResponses(userId) {
      try {
        if (!userId) throw new Error('User ID is required');
        
        return await this.repo.getUserResponses(userId);
      } catch (err) {
        throw new Error(`Usecase Error (getUserResponses): ${err.message}`);
      }
    }
  
    async getRecommendedMeditations(userId, limit = 10) {
      try {
        if (!userId) throw new Error('User ID is required');
        
        return await this.repo.getRecommendedMeditations(userId, limit);
      } catch (err) {
        throw new Error(`Usecase Error (getRecommendedMeditations): ${err.message}`);
      }
    }

    async getQuestionsPaginated(page = 1, limit = 10, filter = {}) {
      try {
        // Validate pagination parameters
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        
        if (pageNum < 1) throw new Error('Page must be greater than 0');
        if (limitNum < 1 || limitNum > 100) throw new Error('Limit must be between 1 and 100');
        
        return await this.repo.getQuestionsPaginated(pageNum, limitNum, filter);
      } catch (err) {
        throw new Error(`Usecase Error (getQuestionsPaginated): ${err.message}`);
      }
    }
  }