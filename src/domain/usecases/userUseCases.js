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
  constructor(
    userRepo,
    otpRepository,
    mailer,
    loginHistoryRepository,
    subscriptionRepo,
  ) {
    this.userRepository = userRepo;
    this.otpRepository = otpRepository;
    this.mailer = mailer;
    this.loginHistoryRepository = loginHistoryRepository;
    this.subscriptionRepository = subscriptionRepo;
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

  subscriptionType = ["Free", "Premium"];

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
      subscriptionType: "Free",
    });

    user.validate();

    const encryptedEmail = encryptDeterministic(user.email);
    let existingUser = await this.userRepository.findByEmail(encryptedEmail);
    if (existingUser) existingUser = this._decryptUser(existingUser);

    // New Logic: If isLogin is true (Sign In), strict check for existing user.
    if (userData.oauth && userData.isLogin === true && !existingUser) {
      throw new Error("User not found. Please sign up.");
    }

    if (existingUser) {
      if (
        userData.oauth &&
        JSON.parse(userData.oauth) &&
        existingUser.signupMethod === "email" &&
        existingUser.active !== true
      ) {
        throw new Error("This email is already registered. Please login");
      }
      if (
        (!userData.oauth || !JSON.parse(userData.oauth)) &&
        existingUser.signupMethod !== "email" &&
        existingUser.active !== true
      ) {
        throw new Error(
          "This email is already registered with OAuth. Please login with OAuth.",
        );
      }
    }

    if (userData.oauth && JSON.parse(userData.oauth) == true) {
      if (existingUser) {
        if (existingUser.active === false) {
          if (existingUser.systemDeactivated) {
            await this.userRepository.reactivateUser(existingUser.id);
          } else {
            throw new Error("Login blocked by admin");
          }
        }

        const updateData = {
          signupMethod: this.signupSelector(Number(userData.method)),
        };

        if (!existingUser.active) {
          updateData.name = userData.name ? userData.name : undefined;
          updateData.image = userData.image;
        }
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

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

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

    // Safe check for oauth status
    const isOauth =
      user.oauth && typeof user.oauth === "string"
        ? JSON.parse(user.oauth)
        : user.oauth === true || user.oauth === "true"; // Handle boolean or string true

    if (isOauth === true) {
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

    const wasActive = verifiedUser.active;
    const isNewRegistration = !user.active;

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

  async checkEmailExists(email) {
    const encryptedEmail = encryptDeterministic(email.toLowerCase());
    const user = await this.userRepository.findByEmail(encryptedEmail);
    return !!user;
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
    const loginHistory = await this.loginHistoryRepository.create({
      userId: user.id,
      role: "USER",
      ipAddress: ip || "",
      device: device || null,
      isActive: true,
    });

    let isSubscribed = false;
    let subscriptionType = "Free";

    if (this.subscriptionRepository) {
      try {
        const subStatus = await this.subscriptionRepository.isUserSubscribed(
          user.id,
        );
        if (subStatus.isSubscribed) {
          isSubscribed = true;
          subscriptionType = "Premium"; // Or fetch from plan name: subStatus.subscription.plan.name
          if (subStatus.subscription?.plan?.name) {
            subscriptionType = subStatus.subscription.plan.name;
          }
        }
      } catch (err) {
        console.error(
          "Error checking subscription status during token generation:",
          err,
        );
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: encryptDeterministic(user.email),
        name: user.name ? encrypt(user.name) : undefined,
        role: "USER",
        sessionId: loginHistory.id,
        isSubscribed: isSubscribed,
        subscriptionType: subscriptionType,
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
