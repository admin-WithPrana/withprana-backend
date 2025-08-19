// import { OTPRepository } from '../../../domain/repositories/userRepository.js';
// import { OTP } from '../../../domain/entities/user.js';

// export class PostgresOTPRepository extends OTPRepository {
//   constructor(prisma) {
//     super();
//     this.prisma = prisma;
//   }

//   async createOTP(otp) {
//     await this.prisma.otps.create({
//       data: {
//         email: otp.email,
//         otpcode: otp.otpcode,
//         expires_at: otp.expires_at,
//         isvalid: otp.isvalid,
//       },
//     });
//   }

//   async findOTPByEmail(email) {
//     const result = await this.prisma.otps.findFirst({
//       where: { email },
//       orderBy: { expires_at: 'desc' },
//     });

//     // return result ? new OTP(result) : null;
//     return {
//       ...result,
//       id:result.id.toString()
//     }
//   }

//   async deleteOTP(email) {
//     await this.prisma.otps.deleteMany({
//       where: { email },
//     });
//   }

//   async updateOTP(email, isValid) {
//     const result = await this.prisma.otps.updateMany({
//       where: { email },
//       data: { isvalid: isValid },
//     });
//     console.log(result)
//     return { ...result, count: Number(result.count) }; 
//   }
  
// }
import { OTPRepository } from '../../../domain/repositories/userRepository.js';
import { OTP } from '../../../domain/entities/user.js';

export class PostgresOTPRepository extends OTPRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async createOTP(otp) {
    await this.prisma.otps.create({
      data: {
        email: otp.email,
        otpcode: otp.otpcode,
        expires_at: otp.expires_at,
        isvalid: otp.isvalid,
      },
    });
  }

  async findOTPByEmail(email) {
    const result = await this.prisma.otps.findFirst({
      where: { email },
      orderBy: { expires_at: 'desc' },
    });

    if (!result) {
      return null;
    }

    return {
      ...result,
      id: result.id.toString()
    };
  }

  async deleteOTP(email) {
    await this.prisma.otps.deleteMany({
      where: { email },
    });
  }

  async updateOTP(email, isValid) {
    const result = await this.prisma.otps.updateMany({
      where: { email },
      data: { isvalid: isValid },
    });
    
    return { ...result, count: Number(result.count) }; 
  }
}