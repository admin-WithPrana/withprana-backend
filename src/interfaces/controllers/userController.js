// import { UserUseCases } from '../../domain/usecases/userUseCases.js';
// import { CreateUserDTO, VerifyUserDTO } from '../dtos/userDTO.js';

// export class UserController {
//   constructor(userRepository, otpRepository, mailer) {
//     this.userUseCases = new UserUseCases(userRepository, otpRepository, mailer);
//   }

//   async register(request, reply) {
//     try {
//       const userDTO = new CreateUserDTO(request.body);
//       const user = await this.userUseCases.registerUser(userDTO);
//       return reply.code(201).send({
//         success: true,
//         message: 'Check your email for OTP'
//       });
//     } catch (error) {
//       return reply.code(400).send({
//         success: false,
//         message: error.message
//       });
//     }
//   }

//   async verify(request, reply) {
//     try {
//       const verifyDTO = new VerifyUserDTO(request.body);
//      const result =  await this.userUseCases.verifyUser(verifyDTO.email, verifyDTO.otp);
      
//      if(result.success){
//       return reply.code(200).send({
//         success: true,
//         message: result.message,
//         token:result.token
//       });
//      }

//      return reply.code(400).send({success:result.success,message:result.message})
//     } catch (error) {
//       return reply.code(400).send({
//         success: false,
//         message: error.message
//       });
//     }
//   }

//   async resendOTP(request, reply) {
//     try {
//       const userDTO = new CreateUserDTO(request.body);
//       await this.userUseCases.resendOTP(userDTO.email);
//       return reply.code(200).send({
//         success: true,
//         message: 'OTP resent successfully'
//       });
//     } catch (error) {
//       return reply.code(400).send({
//         success: false,
//         message: error.message
//       });
//     }
//   }

//   async login(request, reply) {
//     try {
//       const userDTO = new CreateUserDTO(request.body);
//       const result = await this.userUseCases.login(userDTO.email);
  
//       return reply.code(result.success ? 200 : 400).send(result);
//     } catch (error) {
//       return reply.code(500).send({
//         success: false,
//         message: error.message || "Internal server error"
//       });
//     }
//   }
  
//   async getUserById(request, reply) {
//     try {
//       const { id } = request.params;
//       const user = await this.userUseCases.getUserById(id);
//       return reply.code(200).send({ success: true, user });
//     } catch (error) {
//       return reply.code(500).send({ success: false, message: error.message });
//     }
//   }

//   async updateUser(request, reply) {
//     try {
//       const userDTO = new CreateUserDTO(request.body);
//       const id = request.params.id;
//       userDTO.id = id;
//       const user = await this.userUseCases.updateUser(id, userDTO);
//       return reply.code(200).send({
//         success: true,
//         message: 'User updated successfully'
//       });
//     } catch (error) {
//       return reply.code(400).send({
//         success: false,
//         message: error.message
//       });
//     }
//   }
// }
import { UserUseCases } from '../../domain/usecases/userUseCases.js';
import { CreateUserDTO, VerifyUserDTO } from '../dtos/userDTO.js';

export class UserController {
  constructor(userRepository, otpRepository, mailer) {
    this.userUseCases = new UserUseCases(userRepository, otpRepository, mailer);
  }

  async register(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const result = await this.userUseCases.registerUser(userDTO);
      
      if (JSON.parse(result.oauth)) {
        return reply.code(201).send({
          success: true,
          message: result.message,
          token: result.token,
          // user: result.user,
          // oauth: true
        });
      } else {
        return reply.code(201).send({
          success: true,
          message: result.message,
          // user: result.user,
          // oauth: false
        });
      }
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
      const result = await this.userUseCases.verifyUser(verifyDTO.email, verifyDTO.otp);
      
      return reply.code(200).send({
        success: result.success,
        message: result.message,
        token: result.token,
        oauth: result.oauth
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
      const result = await this.userUseCases.resendOTP(userDTO.email);
      
      return reply.code(200).send({
        success: true,
        message: result.message
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
      const result = await this.userUseCases.login(userDTO.email,userDTO.oauth);
  
      // Handle different response structures based on success and OAuth status
      if (result.success) {
        return reply.code(200).send({
          success: true,
          message: result.message,
          token: result.token,
          oauth: result.oauth
        });
      } else {
        return reply.code(400).send({
          success: false,
          message: result.message
        });
      }
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
      return reply.code(200).send({ 
        success: true, 
        user 
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async updateUser(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const { id } = request.params;
      const user = await this.userUseCases.updateUser(id, userDTO);
      
      return reply.code(200).send({
        success: true,
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }

  async getUsers(request, reply) {
    try {
      const filters = request.query;
      const users = await this.userUseCases.getUsers(filters);
      return reply.code(200).send({
        success: true,
        users
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: error.message
      });
    }
  }

  async deactivateUser(request, reply) {
    try {
      const { id } = request.params;
      const user = await this.userUseCases.deactivateUser(id);
      return reply.code(200).send({
        success: true,
        message: 'User deactivated successfully',
        user
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }

  async activateUser(request, reply) {
    try {
      const { id } = request.params;
      const user = await this.userUseCases.activateUser(id);
      return reply.code(200).send({
        success: true,
        message: 'User activated successfully',
        user
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  }
}