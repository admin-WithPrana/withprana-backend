import { OTPRepository } from '../../../domain/repositories/userRepository.js';
import { OTP } from '../../../domain/entities/user.js';

export class PostgresOTPRepository extends OTPRepository {
  constructor(sql) {
    super();
    this.sql = sql;
  }

  async createOTP(otp) {
    await this.sql`
      INSERT INTO otps (email, otpcode, expires_at,isvalid)
      VALUES (${otp.email}, ${otp.otpcode}, ${otp.expires_at}, ${otp.isvalid})
    `;
  }

  async findOTPByEmail(email) {
    const result = await this.sql`
      SELECT * FROM otps 
      WHERE email = ${email} 
      ORDER BY expires_at DESC 
      LIMIT 1
    `;
  
    return result.length ? new OTP(result[0]) : null;
  }
  

  async deleteOTP(email) {
    await this.sql`
      DELETE FROM otps WHERE email = ${email}
    `;
  }

  async updateOTP(email, isValid) {
    console.log(email, isValid, "email and isValid");
    await this.sql`
      UPDATE otps SET isvalid = ${isValid} WHERE email = ${email}
    `;
  }
}