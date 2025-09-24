export class PolicyUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  async createPolicy(data) {
    try {
      if (!data.content || !data.type) {
        throw new Error("Content and type are required");
      }
    
      
      // Check if version already exists for this type
      const existingPolicy = await this.repo.findByVersion(data.type);
      if (existingPolicy) {
        throw new Error(`Policy version ${data.version} already exists for this type`);
      }
      
      // If setting as active, deactivate other policies of same type
      if (data.active) {
        await this.repo.deactivateOtherPolicies(data.type);
      }
      
      return await this.repo.create(data);
    } catch (err) {
      throw new Error(`Usecase Error (createPolicy): ${err.message}`);
    }
  }

  async updatePolicy(id, data) {
    try {
      // Check if policy exists
      const existingPolicy = await this.repo.findById(id);
      if (!existingPolicy) {
        throw new Error("Policy not found");
      }
      
      // Validate policy type if provided
      if (data.type && data.type !== existingPolicy.type) {
        throw new Error("Cannot change policy type");
      }
      
      // If updating version, check for duplicates
      if (data.version && data.version !== existingPolicy.version) {
        const versionExists = await this.repo.findByVersion(data.version, existingPolicy.type);
        if (versionExists) {
          throw new Error(`Policy version ${data.version} already exists for this type`);
        }
      }
      
      // If setting as active, deactivate other policies of same type
      if (data.isActive) {
        await this.repo.deactivateOtherPolicies(existingPolicy.type);
      }
      
      return await this.repo.update(id, data);
    } catch (err) {
      throw new Error(`Usecase Error (updatePolicy): ${err.message}`);
    }
  }

  async getPolicyById(id, type = null) {
    try {
      const policy = await this.repo.findById(id);
      
      if (!policy) {
        throw new Error("Policy not found");
      }
      
      if (type && policy.type !== type) {
        throw new Error("Policy type mismatch");
      }
      
      return policy;
    } catch (err) {
      throw new Error(`Usecase Error (getPolicyById): ${err.message}`);
    }
  }

  async getPolicyByVersion(version, type) {
    try {
      const policy = await this.repo.findByVersion(version, type);
      
      if (!policy) {
        throw new Error(`Policy version ${version} not found for this type`);
      }
      
      return policy;
    } catch (err) {
      throw new Error(`Usecase Error (getPolicyByVersion): ${err.message}`);
    }
  }

  async getLatestActivePolicy(type) {
    try {
      return await this.repo.findLatestActive(type);
    } catch (err) {
      throw new Error(`Usecase Error (getLatestActivePolicy): ${err.message}`);
    }
  }

  async getAllPolicies(filter = {}, skip, take) {
    try {
      return await this.repo.findAllPaginated(filter, skip, take);
    } catch (err) {
      throw new Error(`Usecase Error (getAllPolicies): ${err.message}`);
    }
  }

  async deletePolicy(id, type = null) {
    try {
      // Check if policy exists
      const existingPolicy = await this.repo.findById(id);
      if (!existingPolicy) {
        throw new Error("Policy not found");
      }
      
      if (type && existingPolicy.type !== type) {
        throw new Error("Policy type mismatch");
      }
      
      // Prevent deletion of active policy
      if (existingPolicy.isActive) {
        throw new Error("Cannot delete active policy");
      }
      
      return await this.repo.softDelete(id);
    } catch (err) {
      throw new Error(`Usecase Error (deletePolicy): ${err.message}`);
    }
  }
}