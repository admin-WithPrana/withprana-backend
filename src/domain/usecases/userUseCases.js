import { User, OTP } from "../entities/user.js";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // For random token generation
import { hashToken } from "../../utils/tokenUtils.js";
import {
  encrypt,
  decrypt,
  encryptDeterministic,
  decryptDeterministic,
} from "../../utils/encryption.js";

export class UserUseCases {
  constructor(userRepo, otpRepository, mailer, loginHistoryRepository) {
    this.userRepository = userRepo;
    this.otpRepository = otpRepository;
    this.otpRepository = otpRepository;
    this.mailer = mailer;
    this.loginHistoryRepository = loginHistoryRepository;
  }

  generateRefreshToken() {
    return crypto.randomBytes(40).toString("hex");
  }

  async storeRefreshToken(user, refreshToken) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.createRefreshToken({
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    });
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

  async registerUser(userData, device, ip) {
    console.log("DEBUG: registerUser started for email:", userData.email);
    const user = new User({
      email: userData.email.toLowerCase(),
      name: userData.name,
      image: userData.image,
      oauth: userData.oauth,
      signupMethod: this.signupSelector(Number(userData.method)),
      subscriptionType: "free",
    });

    user.validate();

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
          "This email is already registered with OAuth. Please login with OAuth.",
        );
      }
    }

    if (JSON.parse(userData.oauth) == true) {
      if (existingUser) {
        if (existingUser.active === false) {
          if (existingUser.systemDeactivated) {
            await this.userRepository.reactivateUser(existingUser.id);
          } else {
            throw new Error("Login blocked by admin");
          }
        }

        const updateData = {
          name: userData.name ? userData.name : undefined,
          image: userData.image,
          signupMethod: this.signupSelector(Number(userData.method)),
        };
        Object.keys(updateData).forEach(
          (key) => updateData[key] === undefined && delete updateData[key],
        );

        let updatedUser = await this.userRepository.update(
          existingUser.id,
          updateData,
        );
        updatedUser = this._decryptUser(updatedUser);
        console.log(
          "DEBUG: About to call updateLastLogin with id:",
          updatedUser.id,
        );
        await this.userRepository.updateLastLogin(updatedUser.id);
        console.log("DEBUG: updateLastLogin completed");

        const { token, loginHistory } = await this.generateToken(
          updatedUser,
          device,
          ip,
        );
        const refreshToken = this.generateRefreshToken();
        await this.storeRefreshToken(updatedUser, refreshToken);

        return {
          user: updatedUser,
          loginHistory,
          token,
          refreshToken,
          oauth: true,
          register: false,
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
      await this.userRepository.updateLastLogin(createdUser.id);

      const { token, loginHistory } = await this.generateToken(
        createdUser,
        device,
        ip,
      );
      const refreshToken = this.generateRefreshToken();
      await this.storeRefreshToken(createdUser, refreshToken);

      return {
        user: createdUser,
        token,
        loginHistory,
        refreshToken,
        oauth: true,
        register: true,
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
      if (existingUser.active === true) {
        throw new Error("This email is already registered. Please login");
      }

      if (existingUser.active === false) {
        if (existingUser.systemDeactivated) {
          await this.userRepository.reactivateUser(existingUser.id);
        } else {
          throw new Error("Login blocked by admin");
        }
      }

      await this.otpRepository.createOTP(otp);
      // Send email to plain email
      await this.sendOTPEmail(user.email, otpCode);
      return {
        user: existingUser,
        oauth: false,
        register: false,
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
      register: true,
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

  async verifyUser(email, otpCode, device, ip) {
    const encryptedEmail = encryptDeterministic(email);
    let user = await this.userRepository.findByEmail(encryptedEmail);
    if (user) user = this._decryptUser(user);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.oauth === true) {
      const { token, loginHistory } = await this.generateToken(
        user,
        device,
        ip,
      );
      const refreshToken = this.generateRefreshToken();
      await this.storeRefreshToken(user, refreshToken);

      return {
        success: true,
        token,
        loginHistory,
        refreshToken,
        oauth: true,
        register: false,
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
    await this.userRepository.updateLastLogin(verifiedUser.id);

    const { token, loginHistory } = await this.generateToken(
      verifiedUser,
      device,
      ip,
    );

    const refreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(verifiedUser, refreshToken);

    const wasActive = verifiedUser.active; // Capture previous state - WAIT. user is ALREADY verified and active by line 284.
    // Wait, line 284: let verifiedUser = await this.userRepository.verifyEmail(encryptedEmail);
    // This typically sets verified and active to true.
    // So I need to capture state BEFORE line 284?
    // In `verifyUser` function at line 250:
    // line 252: let user = await this.userRepository.findByEmail(encryptedEmail);
    // line 253: if (user) ...
    // So 'user' holds the state BEFORE verification.

    // Logic:
    // If 'user.active' was false (or user.isVerified was false), then this is a NEW registration (completing verification).
    // If 'user.active' was true, then this is a Login (just checking OTP).

    // However, verifyUser is specifically for verifying email/OTP.
    // If it's a login flow (login -> send OTP -> verify OTP), the user is ALREADY active.
    // If it's a register flow (register -> send OTP -> verify OTP), the user is NOT active yet (or verified).

    const isNewRegistration = !user.active; // using the 'user' fetch at start of function

    return {
      success: true,
      token,
      loginHistory,
      refreshToken,
      oauth: false,
      register: isNewRegistration,
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
        if (existingUser.systemDeactivated) {
          await this.userRepository.reactivateUser(existingUser.id);
        } else {
          return { success: false, message: "Login blocked by admin" };
        }
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

  async generateToken(user, device, ip) {
    console.log("DEBUG: generateToken called");
    console.log("DEBUG: user.id:", user.id, "Type:", typeof user.id);
    console.log("DEBUG: device:", device, "Type:", typeof device);
    console.log("DEBUG: ip:", ip, "Type:", typeof ip);

    const loginData = {
      userId: user.id,
      role: "USER",
      ipAddress: ip || "",
      device:
        typeof device === "string" ? device : JSON.stringify(device) || null,
      isActive: true,
    };
    console.log("DEBUG: loginData prepared:", loginData);

    const loginHistory = await this.loginHistoryRepository.create(loginData);

    const token = jwt.sign(
      {
        id: user.id,
        email: encryptDeterministic(user.email),
        name: user.name ? encrypt(user.name) : undefined,
        role: "USER",
        sessionId: loginHistory.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return {
      token,
      loginHistory,
    };
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

  async logoutUser(userId) {
    const loginHistory =
      await this.loginHistoryRepository.logoutLastForUser(userId);

    if (!loginHistory) {
      return null;
    }

    return loginHistory;
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
  async deleteUser(id) {
    const user = await this.userRepository.deleteUser(id);
    return user;
  }

  async refreshToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new Error("Refresh Token missing");
    }

    const hashedIncoming = hashToken(incomingRefreshToken);
    const existingToken =
      await this.userRepository.findRefreshToken(hashedIncoming);

    if (!existingToken) {
      throw new Error("Invalid Refresh Token");
    }

    if (existingToken.revoked || new Date() > existingToken.expiresAt) {
      throw new Error("Refresh Token invalid or expired");
    }

    const user = await this.userRepository.findById(existingToken.userId);
    if (!user) throw new Error("User not found");
    const decryptedUser = this._decryptUser(user);

    // Rotation: Revoke old
    await this.userRepository.revokeRefreshToken(existingToken.id);

    const newAccessToken = this.generateToken(decryptedUser);
    const newRefreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(decryptedUser, newRefreshToken);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: decryptedUser,
      success: true,
    };
  }
}
