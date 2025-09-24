export class PolicyController {
  constructor(usecase) {
    this.usecase = usecase;
  }

  async create(req, reply) {
    try {
      const { type } = req.params;

      const policy = await this.usecase.createPolicy({
        ...req.body,
        type: Number(type)
      });
      
      return reply.code(201).send({
        message: "Policy created successfully",
        data: policy,
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async update(req, reply) {
    try {
      const { type, id } = req.params;
      const policyType = this.validatePolicyType(type);
      
      const policy = await this.usecase.updatePolicy(id, {
        ...req.body,
        type: policyType
      });
      
      return reply.code(200).send({
        message: "Policy updated successfully",
        data: policy,
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async getById(req, reply) {
    try {
      const { type, id } = req.params;
      const policyType = this.validatePolicyType(type);
      
      const policy = await this.usecase.getPolicyById(id, policyType);
      
      if (!policy) {
        return reply.code(404).send({ 
          message: "Policy not found",
          error: "POLICY_NOT_FOUND"
        });
      }
      
      return reply.code(200).send({
        message: "Policy fetched successfully",
        data: policy,
      });
      
    } catch (err) {
      if (err.message.includes("not found")) {
        return reply.code(404).send({ 
          error: "Policy not found",
          message: err.message 
        });
      }
      
      if (err.message.includes("Invalid policy type")) {
        return reply.code(400).send({ 
          error: "Invalid policy type",
          message: err.message 
        });
      }
      
      return reply.code(400).send({ 
        error: "Bad Request",
        message: err.message 
      });
    }
  }

  async getByVersion(req, reply) {
    try {
      const { type, version } = req.params;
      const policyType = this.validatePolicyType(type);
      
      const policy = await this.usecase.getPolicyByVersion(version, policyType);
      
      if (!policy) {
        return reply.code(404).send({ 
          message: "Policy version not found",
          error: "POLICY_VERSION_NOT_FOUND"
        });
      }
      
      return reply.code(200).send({
        message: "Policy version fetched successfully",
        data: policy,
      });
      
    } catch (err) {
      if (err.message.includes("not found")) {
        return reply.code(404).send({ 
          error: "Policy version not found",
          message: err.message 
        });
      }
      
      return reply.code(400).send({ 
        error: "Bad Request",
        message: err.message 
      });
    }
  }

  async getLatestActive(req, reply) {
    try {
      const { type } = req.params;
      const policyType = this.validatePolicyType(type);
      
      const policy = await this.usecase.getLatestActivePolicy(policyType);
      
      if (!policy) {
        return reply.code(404).send({ 
          message: "No active policy found",
          error: "NO_ACTIVE_POLICY"
        });
      }
      
      return reply.code(200).send({
        message: "Latest active policy fetched successfully",
        data: policy,
      });
      
    } catch (err) {
      return reply.code(400).send({ 
        error: "Bad Request",
        message: err.message 
      });
    }
  }

  async getAllByType(req, reply) {
    try {
      const { type } = req.params;
      const policyType = this.validatePolicyType(type);
      const { isActive, isDeleted, page = 1, limit = 10 } = req.query;
      
      const filter = { type: policyType };
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (isDeleted !== undefined) filter.isDeleted = isDeleted === 'true';
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const { policies, totalCount } = await this.usecase.getAllPolicies(
        filter,
        skip,
        parseInt(limit)
      );

      return reply.code(200).send({
        message: "Policies fetched successfully",
        data: policies,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async getAll(req, reply) {
    try {
      const { type, isActive, isDeleted, page = 1, limit = 10 } = req.query;
      
      const filter = {};
      if (type) filter.type = parseInt(type);
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (isDeleted !== undefined) filter.isDeleted = isDeleted === 'true';
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const { policies, totalCount } = await this.usecase.getAllPolicies(
        filter,
        skip,
        parseInt(limit)
      );

      return reply.code(200).send({
        message: "All policies fetched successfully",
        data: policies,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async delete(req, reply) {
    try {
      const { type, id } = req.params;
      const policyType = this.validatePolicyType(type);
      
      await this.usecase.deletePolicy(id, policyType);
      return reply.code(200).send({ message: "Policy deleted successfully" });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  validatePolicyType(type) {
    const typeUpper = type.toUpperCase();
    if (typeUpper === 'PRIVACY' || typeUpper === 'PRIVACY-POLICY') {
      return this.policyTypes.PRIVACY;
    } else if (typeUpper === 'TERMS' || typeUpper === 'TERMS-CONDITIONS') {
      return this.policyTypes.TERMS;
    }
    throw new Error(`Invalid policy type: ${type}. Must be 'privacy' or 'terms'`);
  }
}