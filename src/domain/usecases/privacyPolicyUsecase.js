export class PolicyUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  async createPolicy(data) {
    try {
      if (!data.content || !data.type) {
        throw new Error("Content and type are required");
      }
    
      const existingPolicy = await this.repo.findByType(Number(data?.type));
      if (existingPolicy) {
        return await this.repo.update(data.type,data)
      }
      
      return await this.repo.create(data);
    } catch (err) {
      console.log(err.message)
      throw new Error(`Usecase Error (createPolicy): ${err.message}`);
    }
  }

  async getPolicyById(type) {
    try {
      const policy = await this.repo.findByType(Number(type));
      console.log(policy)
      return policy;
    } catch (err) {
      throw new Error(`Usecase Error (getPolicyById): ${err.message}`);
    }
  }
}