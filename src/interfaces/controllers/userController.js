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
        // data: { id: user.id, email: user.email },
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
      await this.userUseCases.verifyUser(verifyDTO.email, verifyDTO.otp);
      return reply.code(200).send({
        success: true,
        message: 'Email verified successfully'
      });
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
}