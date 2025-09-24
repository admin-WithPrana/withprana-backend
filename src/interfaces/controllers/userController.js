import { UserUseCases } from '../../domain/usecases/userUseCases.js';
import { CreateUserDTO, VerifyUserDTO } from '../dtos/userDTO.js';

export class UserController {
  constructor(userRepository, otpRepository, mailer) {
    this.userUseCases = new UserUseCases(userRepository, otpRepository, mailer);
  }

  async register(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const user = await this.userUseCases.registerUser(userDTO);
      return reply.code(201).send({
        success: true,
        message: 'Check your email for OTP'
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }

  async verify(request, reply) {
    try {
      const verifyDTO = new VerifyUserDTO(request.body);
     const result =  await this.userUseCases.verifyUser(verifyDTO.email, verifyDTO.otp);
      
     if(result.success){
      return reply.code(200).send({
        success: true,
        message: result.message,
        token:result.token
      });
     }

     return reply.code(400).send({success:result.success,message:result.message})
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }

  async resendOTP(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      await this.userUseCases.resendOTP(userDTO.email);
      return reply.code(200).send({
        success: true,
        message: 'OTP resent successfully'
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }

  async login(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const result = await this.userUseCases.login(userDTO.email);
  
      return reply.code(result.success ? 200 : 400).send(result);
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: error.message || "Internal server error"
      });
    }
  }
  
  async getUserById(request, reply) {
    try {
      const { id } = request.params;
      const user = await this.userUseCases.getUserById(id);
      return reply.code(200).send({ success: true, user });
    } catch (error) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  }

  async updateUser(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const id = request.params.id;
      userDTO.id = id;
      const user = await this.userUseCases.updateUser(id, userDTO);
      return reply.code(200).send({
        success: true,
        message: 'User updated successfully'
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }
}