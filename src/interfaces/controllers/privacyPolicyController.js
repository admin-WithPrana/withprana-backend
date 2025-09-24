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
      
      let message =""
      if(Number(type == 1)){
        message = "Policy created successfully"
      }else{
        message ="Terms and Conditions created successfully"
      }

      return reply.code(201).send({
        message: message,
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
      const { type} = req.params;
      
      const policy = await this.usecase.getPolicyById(type);
      console.log(policy,"policy")
      
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
}