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
import { UserUseCases } from "../../domain/usecases/userUseCases.js";
import { CreateUserDTO, VerifyUserDTO } from "../dtos/userDTO.js";

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
          refreshToken: result.refreshToken,
          register: result.register,
          // user: result.user,
          // oauth: true
        });
      } else {
        return reply.code(201).send({
          success: true,
          token: result.token,
          // For non-oauth (OTP flow), register usually just sends OTP.
          // But if auto-login is enabled after register, we need tokens.
          // userUseCases.registerUser returns tokens if oauth=true, or "OTP sent" if oauth=false.
          // IF oauth is false, result.token is UNDEFINED usually (unless immediate login).
          // But looking at code: registerUser returns { token, refreshToken, oauth: true } for oauth.
          // For non-oauth, it returns { message: "OTP sent" }.
          // So line 122 matches oauth flow.
          // Line 127 is for else (JSON.parse(result.oauth) is false).
          // If false, result is { message: "OTP sent" }. No token.
          // So I don't need to add refreshToken here for OTP flow.
          message: result.message,
          register: result.register,
          // user: result.user,
          // oauth: false
        });
      }
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async verify(request, reply) {
    try {
      const verifyDTO = new VerifyUserDTO(request.body);
      const result = await this.userUseCases.verifyUser(
        verifyDTO.email,
        verifyDTO.otp,
      );

      return reply.code(200).send({
        success: result.success,
        message: result.message,
        token: result.token,
        oauth: result.oauth,
        register: result.register,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async resendOTP(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const result = await this.userUseCases.resendOTP(userDTO.email);

      return reply.code(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async login(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const result = await this.userUseCases.login(
        userDTO.email,
        userDTO.oauth,
      );

      // Handle different response structures based on success and OAuth status
      if (result.success) {
        return reply.code(200).send({
          success: true,
          message: result.message,
          token: result.token,
          refreshToken: result.refreshToken, // Add refresh token to response
          oauth: result.oauth,
        });
      } else {
        return reply.code(400).send({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async refresh(request, reply) {
    try {
      const { refreshToken } = request.body;
      const result = await this.userUseCases.refreshToken(refreshToken);

      return reply.code(200).send({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (error) {
      return reply.code(401).send({
        success: false,
        message: error.message || "Invalid Refresh Token",
      });
    }
  }

  async getUserById(request, reply) {
    try {
      const { id } = request.params;
      const requestingUser = request.user;

      const user = await this.userUseCases.getUserById(id);

      if (!user) {
        return reply
          .code(404)
          .send({ success: false, message: "User not found" });
      }

      // Authorization & Privacy Logic
      // If the requesting user is NOT the owner, filter private data
      if (!requestingUser || String(requestingUser.id) !== String(user.id)) {
        return reply.code(200).send({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
            // Do NOT expose email, subscription details, etc.
          },
        });
      }

      // If owner, return full data
      return reply.code(200).send({
        success: true,
        user,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: error.message,
      });
    }
  }

  async updateUser(request, reply) {
    try {
      const userDTO = new CreateUserDTO(request.body);
      const { id } = request.params;
      const requestingUser = request.user || request.body.user; // Use request.user from middleware if available

      // Authorization Check: Ensure user updates their own profile
      if (!requestingUser || String(requestingUser.id) !== String(id)) {
        return reply.code(403).send({
          success: false,
          message: "Unauthorized: You can only update your own profile",
        });
      }

      userDTO.id = id;
      const user = await this.userUseCases.updateUser(id, userDTO);

      return reply.code(200).send({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async getUsers(request, reply) {
    try {
      const filters = request.query;
      const users = await this.userUseCases.getUsers(filters);
      return reply.code(200).send({
        success: true,
        users,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: error.message,
      });
    }
  }

  async deactivateUser(request, reply) {
    try {
      const { id } = request.params;
      const user = await this.userUseCases.deactivateUser(id);
      return reply.code(200).send({
        success: true,
        message: "User deactivated successfully",
        user,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }

  async activateUser(request, reply) {
    try {
      const { id } = request.params;
      const user = await this.userUseCases.activateUser(id);
      return reply.code(200).send({
        success: true,
        message: "User activated successfully",
        user,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }
  async deleteUser(request, reply) {
    try {
      const { id } = request.params;

      // Verify that the authenticated user is deleting their own account
      if (!request.user || String(request.user.id) !== String(id)) {
        // Allow admin override if needed, but for now strict self-deletion
        return reply.code(403).send({
          success: false,
          message: "Unauthorized: You can only delete your own account",
        });
      }

      const user = await this.userUseCases.deleteUser(id);

      return reply.code(200).send({
        success: true,
        message: "User deleted successfully",
        // user // Do not return user data on delete usually, but for confirmation maybe id
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error.message,
      });
    }
  }
}
