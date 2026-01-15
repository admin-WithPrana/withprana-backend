import { User, OTP } from "../entities/user.js";
import jwt from "jsonwebtoken";
import {
  encrypt,
  decrypt,
  encryptDeterministic,
  decryptDeterministic,
} from "../../utils/encryption.js";

export class UserUseCases {
  constructor(userRepo, otpRepository, mailer) {
    this.userRepository = userRepo;
    this.otpRepository = otpRepository;
    this.mailer = mailer;
  }

  subscriptionType = ["free", "premium", "enterprise"];

  signupSelector(type) {
    let subType = "email";
    if (type === 1) {
      subType = "email";
    } else if (type === 2) {
      subType = "google";
    } else if (type === 3) {
      subType = "apple";
    }
    return subType;
  }

  _decryptUser(user) {
    if (!user) return user;
    const decrypted = { ...user };
    if (decrypted.name) decrypted.name = decrypt(decrypted.name);
    if (decrypted.email)
      decrypted.email = decryptDeterministic(decrypted.email);
    return decrypted;
  }

  async registerUser(userData) {
    const user = new User({
      email: userData.email,
      name: userData.name,
      image: userData.image,
      oauth: userData.oauth,
      signupMethod: this.signupSelector(Number(userData.method)),
      subscriptionType: "free",
    });

    user.validate();

    // Check using deterministic encrypted email
    const encryptedEmail = encryptDeterministic(user.email);
    let existingUser = await this.userRepository.findByEmail(encryptedEmail);
    if (existingUser) existingUser = this._decryptUser(existingUser);

    if (existingUser) {
      if (
        JSON.parse(userData.oauth) &&
        existingUser.signupMethod === "email" &&
        existingUser.active !== true
      ) {
        throw new Error("This email is already registered. Please login");
      }
      if (
        !JSON.parse(userData.oauth) &&
        existingUser.signupMethod !== "email" &&
        existingUser.active !== true
      ) {
        throw new Error(
          "This email is already registered with OAuth. Please login with OAuth."
        );
      }
    }

    if (JSON.parse(userData.oauth) == true) {
      if (existingUser) {
        if (existingUser.active === false) {
          throw new Error("Login blocked by admin");
        }

        // Encrypt name before updating
        const updateData = {
          name: userData.name ? userData.name : undefined,
          image: userData.image,
          signupMethod: this.signupSelector(Number(userData.method)),
        };
        // Remove undefined keys
        Object.keys(updateData).forEach(
          (key) => updateData[key] === undefined && delete updateData[key]
        );

        let updatedUser = await this.userRepository.update(
          existingUser.id,
          updateData
        );
        updatedUser = this._decryptUser(updatedUser);

        const token = this.generateToken(updatedUser);
        return {
          user: updatedUser,
          token,
          oauth: true,
          message: "Login successful",
        };
      }

      user.isVerified = true;
      user.active = true;

      const userToSave = {
        ...user,
        name: user.name,
        email: encryptedEmail,
      };

      let createdUser = await this.userRepository.createUser(userToSave);
      createdUser = this._decryptUser(createdUser);

      const token = this.generateToken(createdUser);

      return {
        user: createdUser,
        token,
        oauth: true,
        message: "Registration successful",
      };
    }

    // Non-OAuth flow
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store OTP with encrypted email
    const otp = new OTP({
      email: encryptedEmail,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true,
    });

    if (existingUser) {
      if (existingUser.active === false) {
        throw new Error("Login blocked by admin");
      }

      await this.otpRepository.createOTP(otp);
      // Send email to plain email
      await this.sendOTPEmail(user.email, otpCode);
      return {
        user: existingUser,
        oauth: false,
        message: "OTP sent for verification",
      };
    }

    const userToSave = {
      ...user,
      name: user.name,
      email: encryptedEmail,
    };

    let createdUser = await this.userRepository.createUser(userToSave);
    createdUser = this._decryptUser(createdUser);

    await this.otpRepository.createOTP(otp);
    await this.sendOTPEmail(user.email, otpCode);

    return {
      user: createdUser,
      oauth: false,
      message: "OTP sent for verification",
    };
  }

  async resendOTP(email) {
    const encryptedEmail = encryptDeterministic(email);
    let user = await this.userRepository.findByEmail(encryptedEmail);
    if (user) user = this._decryptUser(user);

    if (!user) {
      throw new Error("User not found");
    }

    if (JSON.parse(user.oauth) === true) {
      throw new Error("OAuth users do not require OTP verification");
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otp = new OTP({
      email: encryptedEmail,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true,
    });

    await this.otpRepository.createOTP(otp);
    await this.sendOTPEmail(user.email, otpCode);

    return { success: true, message: "OTP resent successfully" };
  }

  async verifyUser(email, otpCode) {
    const encryptedEmail = encryptDeterministic(email);
    let user = await this.userRepository.findByEmail(encryptedEmail);
    if (user) user = this._decryptUser(user);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.oauth === true) {
      const token = this.generateToken(user);
      return {
        success: true,
        token,
        oauth: true,
        message: "OAuth user verified successfully",
      };
    }

    const otp = await this.otpRepository.findOTPByEmail(encryptedEmail);

    if (!otp || otp.otpCode !== otpCode) {
      throw new Error("Invalid OTP");
    }

    if (!otp.isValid) {
      await this.otpRepository.updateOTP(encryptedEmail, false);
      throw new Error("OTP has expired");
    }

    let verifiedUser = await this.userRepository.verifyEmail(encryptedEmail);
    verifiedUser = this._decryptUser(verifiedUser);

    await this.otpRepository.updateOTP(encryptedEmail, false);

    const token = this.generateToken(verifiedUser);

    return {
      success: true,
      token,
      oauth: false,
      message: "OTP verified successfully",
    };
  }

  async login(email, oauth) {
    try {
      const encryptedEmail = encryptDeterministic(email);
      let existingUser = await this.userRepository.findByEmail(encryptedEmail);
      if (existingUser) existingUser = this._decryptUser(existingUser);

      if (!existingUser) {
        return { success: false, message: "No user found" };
      }

      if (existingUser.active === false) {
        return { success: false, message: "Login blocked by admin" };
      }

      if (["google", "apple"].includes(existingUser.signupMethod)) {
        return {
          success: false,
          message: `This email is linked with ${existingUser.signupMethod} sign-in. Please use ${existingUser.signupMethod} to log in.`,
        };
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const otp = new OTP({
        email: encryptedEmail,
        otpcode: otpCode,
        expires_at: expiresAt,
        isvalid: true,
      });

      await this.otpRepository.createOTP(otp);
      await this.sendOTPEmail(email, otpCode); // use plain email

      return {
        success: true,
        oauth: false,
        message: "OTP sent to your email",
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: encryptDeterministic(user.email),
        name: user.name ? encrypt(user.name) : undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  async sendOTPEmail(email, otpCode) {
    const mailOptions = {
      from: '"Test App" <no-reply@yourapp.com>',
      to: email,
      subject: "OTP for verification",
      text: `Your OTP is: ${otpCode}`,
      html: `<p>Your OTP is: <strong>${otpCode}</strong></p>`,
    };

    await this.mailer.sendMail(mailOptions);
  }

  async getUsers(filters) {
    const users = await this.userRepository.findAll(filters);
    // findAll returns { data: [], pagination: {} }
    if (users && users.data) {
      users.data = users.data.map((u) => this._decryptUser(u));
    }
    return users;
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    return this._decryptUser(user);
  }

  async deactivateUser(id) {
    const user = await this.userRepository.update(id, { active: false });
    return this._decryptUser(user);
  }

  async activateUser(id) {
    const user = await this.userRepository.update(id, { active: true });
    return this._decryptUser(user);
  }

  async updateUser(id, data) {
    const updateData = { ...data };
    if (updateData.name) updateData.name = updateData.name;
    if (updateData.email)
      updateData.email = encryptDeterministic(updateData.email);

    const user = await this.userRepository.update(id, updateData);
    return this._decryptUser(user);
  }
}
