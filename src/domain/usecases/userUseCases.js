import { User, OTP } from '../entities/user.js';

export class UserUseCases {
  constructor(userRepository, otpRepository, mailer) {
    this.userRepository = userRepository;
    this.otpRepository = otpRepository;
    this.mailer = mailer;
  }

  // async registerUser(userData) {
  //   const user = new User({
  //     email: userData.email,
  //     name: userData.name,
  //     password: null
  //   });

  //   user.validate();

  //   const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  //   const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  //   const otp = new OTP({
  //     email: user.email,
  //     otpcode: otpCode,
  //     expires_at: expiresAt,
  //     isvalid: true
  //   });

  //   const existingUser = await this.userRepository.findByEmail(user.email);

  //   if (existingUser) {
  //     await this.otpRepository.createOTP(otp);
  //     // throw new Error('User already exists');
  //   }

  //   const createdUser = await this.userRepository.create(user);

  //   await this.otpRepository.createOTP(otp);

  //   await this.sendOTPEmail(user.email, otpCode);

  //   return createdUser;
  // }
  async registerUser(userData) {
    const user = new User({
      email: userData.email,
      name: userData.name,
      password: null
    });
  
    user.validate();
  
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
    const otp = new OTP({
      email: user.email,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true
    });
  
    const existingUser = await this.userRepository.findByEmail(user.email);
  
    if (existingUser) {
      if (existingUser.active === true) {
        await this.otpRepository.createOTP(otp);
        await this.sendOTPEmail(existingUser.email, otpCode);
        return existingUser;
      } else {
        await this.otpRepository.createOTP(otp);
        await this.sendOTPEmail(existingUser.email, otpCode);
        return existingUser;
      }
    }
  
    const createdUser = await this.userRepository.create(user);
  
    await this.otpRepository.createOTP(otp);
    await this.sendOTPEmail(user.email, otpCode);
  
    return createdUser;
  }
  

  async resendOTP(email) {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new Error('User not found');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otp = new OTP({
      email: user.email,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true
    });

    await this.otpRepository.createOTP(otp);

    await this.sendOTPEmail(user.email, otpCode);

    return { success: true };
  }

  async verifyUser(email, otpCode) {
    const otp = await this.otpRepository.findOTPByEmail(email);

    if (!otp || otp.otpcode !== otpCode) {
      throw new Error('Invalid OTP');
    }

    if (!otp.isvalid) {
      await this.otpRepository.updateOTP(email, false);
      throw new Error('OTP has expired');
    }

    await this.userRepository.verifyEmail(email);
    await this.otpRepository.updateOTP(email, false);

    return { success: true };
  }

  async sendOTPEmail(email, otpCode) {
    const mailOptions = {
      from: '"Test App" <no-reply@yourapp.com>',
      to: email,
      subject: 'OTP for verification',
      text: `Your OTP is: ${otpCode}`,
      html: `<p>Your OTP is: <strong>${otpCode}</strong></p>`
    };

    await this.mailer.sendMail(mailOptions);
  }

  async getUsers() {
    return this.userRepository.findAll();
  }

  async getUserById(id) {
    return this.userRepository.findById(id);
  }

  async deactivateUser(id) {
    return this.userRepository.update(id, { active: false });
  }

  async activateUser(id) {
    return this.userRepository.update(id, { active: true });
  }
}
