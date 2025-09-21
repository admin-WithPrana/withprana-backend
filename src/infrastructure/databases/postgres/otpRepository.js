import { OTPRepository } from '../../../domain/repositories/userRepository.js';
import { OTP } from '../../../domain/entities/user.js';

export class PostgresOTPRepository extends OTPRepository {
  constructor(prisma) {
    super();
    console.log('PostgresOTPRepository constructor called with prisma:', prisma); // Debug
    if (!prisma) {
      throw new Error('Prisma client is required for PostgresOTPRepository');
    }
    this.prisma = prisma;
  }

  async createOTP(otp) {
    try {
      return await this.prisma.otp.create({
        data: {
          email: otp.email,
          otpCode: otp.otpcode,
          expiresAt: otp.expires_at,
          isValid: otp.isvalid,
        },
      });
    } catch (error) {
      console.error('Error in createOTP:', error);
      throw error;
    }
  }

  async findOTPByEmail(email) {
    try {
      const result = await this.prisma.otp.findFirst({ 
        where: { 
          email: email.toLowerCase(),
          isValid: true
        },
        orderBy: { created_at: 'desc' }
      });

      if (!result) {
        return null;
      }
  
      return {
        ...result,
        id: result.id.toString()
      };
    } catch (error) {
      console.error('Error in findOTPByEmail:', error);
      throw error;
    }
  }
  

  async deleteOTP(email) {
    try {
      await this.prisma.otp.deleteMany({ 
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      console.error('Error in deleteOTP:', error);
      throw error;
    }
  }

  async updateOTP(email, isValid) {
    try {
      const result = await this.prisma.otp.updateMany({ // Changed from otps to otp
        where: { email: email.toLowerCase() },
        data: { isValid: isValid },
      });
      
      return { ...result, count: Number(result.count) }; 
    } catch (error) {
      console.error('Error in updateOTP:', error);
      throw error;
    }
  }
}