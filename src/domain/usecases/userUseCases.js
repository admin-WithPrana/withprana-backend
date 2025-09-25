// import { User, OTP } from "../entities/user.js";
// import jwt from "jsonwebtoken";

// export class UserUseCases {
//   constructor(userRepo, otpRepository, mailer) {
//     this.userRepository = userRepo;
//     this.otpRepository = otpRepository;
//     this.mailer = mailer;
//   }

//   subscriptionType = ['free', 'premium', 'enterprise'];
//   signupSelector(type) {
//     let subType = "email"
//     if(type=== 1){
//       subType="email"
//     }else if(type===2){  
//       subType="google"
//     }else if(type===3){  
//       subType="apple"
//     }
//     return subType;
//   }

//   async registerUser(userData) {
//     const user = new User({
//       email: userData.email,
//       name: userData.name,
//       image:userData.image,
//       oauth: userData.oauth,
//       signupMethod: this.signupSelector(Number(userData.method)),
//       subscriptionType: 'free'
//     });

//     user.validate();

//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     const otp = new OTP({
//       email: user.email,
//       otpcode: otpCode,
//       expires_at: expiresAt,
//       isvalid: true,
//     });

//     const existingUser = await this.userRepository.findByEmail(user.email);

//     if (existingUser) {
//       if (existingUser.active === true) {
//         await this.otpRepository.createOTP(otp);
//         await this.sendOTPEmail(existingUser.email, otpCode);
//         return existingUser;
//       } else {
//         await this.otpRepository.createOTP(otp);
//         await this.sendOTPEmail(existingUser.email, otpCode);
//         return existingUser;
//       }
//     }

//     const createdUser = await this.userRepository.createUser(user);

//     await this.otpRepository.createOTP(otp);
//     await this.sendOTPEmail(user.email, otpCode);

//     return createdUser;
//   }

//   async resendOTP(email) {
//     const user = await this.userRepository.findByEmail(email);

//     if (!user) {
//       throw new Error("User not found");
//     }

//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     const otp = new OTP({
//       email: user.email,
//       otpcode: otpCode,
//       expires_at: expiresAt,
//       isvalid: true,
//     });

//     await this.otpRepository.createOTP(otp);

//     await this.sendOTPEmail(user.email, otpCode);

//     return { success: true };
//   }

//   async verifyUser(email, otpCode) {
//     const otp = await this.otpRepository.findOTPByEmail(email);

//     if (!otp || otp.otpCode !== otpCode) {
//       throw new Error("Invalid OTP");
//     }

//     if (!otp.isValid) {
//       await this.otpRepository.updateOTP(email, false);
//       throw new Error("OTP has expired");
//     }

//     const user = await this.userRepository.verifyEmail(email);

//     await this.otpRepository.updateOTP(email, false);
  
//     const token = jwt.sign(
//       { id: user.id, email: user.email,name:user?.name},  
//       process.env.JWT_SECRET,            
//       { expiresIn: "1h" }     
//     );
  
//     return {
//       success: true,
//       token,
//       message:"Otp verified successfull"
//     };
//   }

//   async sendOTPEmail(email, otpCode) {
//     const mailOptions = {
//       from: '"Test App" <no-reply@yourapp.com>',
//       to: email,
//       subject: "OTP for verification",
//       text: `Your OTP is: ${otpCode}`,
//       html: `<p>Your OTP is: <strong>${otpCode}</strong></p>`,
//     };

//     await this.mailer.sendMail(mailOptions);
//   }

//   async getUsers(filters) {
//   return this.userRepository.findAll(filters);
// }


//   async getUserById(id) {
//     return this.userRepository.findById(id);
//   }

//   async deactivateUser(id) {
//     return this.userRepository.update(id, { active: false });
//   }

//   async activateUser(id) {
//     return this.userRepository.update(id, { active: true });
//   }

//   async login(email) {
//     try {
//       const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//       const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//       const otp = new OTP({
//         email: email,
//         otpcode: otpCode,
//         expires_at: expiresAt,
//         isvalid: true,
//       });

//       const existingUser = await this.userRepository.findByEmail(email);

//       if (existingUser) {
//         if (existingUser.active === true) {
//           await this.otpRepository.createOTP(otp);
//           await this.sendOTPEmail(existingUser.email, otpCode);
//           return {success:true,message:"Otp shared to your email"}
//         }else{
//           return {success:false,message:"Login blocked by admin"}
//         }
//       }

//       return {success:false,message:"No user found"}
//     } catch (error) {
//       console.error(error);
//     }
//   }

//   async getUserById(id) {
//     return this.userRepository.findById(id);
//   }

//   async updateUser(id, data) {
//     return this.userRepository.update(id, data);
//   }
// }
import { User, OTP } from "../entities/user.js";
import jwt from "jsonwebtoken";

export class UserUseCases {
  constructor(userRepo, otpRepository, mailer) {
    this.userRepository = userRepo;
    this.otpRepository = otpRepository;
    this.mailer = mailer;
  }

  subscriptionType = ['free', 'premium', 'enterprise'];
  
  signupSelector(type) {
    let subType = "email"
    if(type === 1){
      subType="email"
    }else if(type === 2){  
      subType="google"
    }else if(type === 3){  
      subType="apple"
    }
    return subType;
  }

  // async registerUser(userData) {
  //   const user = new User({
  //     email: userData.email,
  //     name: userData.name,
  //     image: userData.image,
  //     oauth: userData.oauth,
  //     signupMethod: this.signupSelector(Number(userData.method)),
  //     subscriptionType: 'free'
  //   });

  //   user.validate();

  //   if (JSON.parse(userData.oauth) == true) {
  //     const existingUser = await this.userRepository.findByEmail(user.email);

  //     if (existingUser) {
  //       if (existingUser.active === false) {
  //         throw new Error("Login blocked by admin");
  //       }
        

  //       const updatedUser = await this.userRepository.update(existingUser.id, {
  //         name: userData.name,
  //         image: userData.image,
  //         signupMethod: this.signupSelector(Number(userData.method))
  //       });

  //       const token = this.generateToken(updatedUser);
  //       return {
  //         user: updatedUser,
  //         token,
  //         oauth: true,
  //         message: "OAuth registration successful"
  //       };
  //     }

  //     user.isVerified = true
  //     user.active = true
  //     const createdUser = await this.userRepository.createUser(user);
  //     const token = this.generateToken(createdUser);
      
  //     return {
  //       user: createdUser,
  //       token,
  //       oauth: true,
  //       message: "OAuth registration successful"
  //     };
  //   }


  //   const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  //   const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  //   const otp = new OTP({
  //     email: user.email,
  //     otpcode: otpCode,
  //     expires_at: expiresAt,
  //     isvalid: true,
  //   });

  //   const existingUser = await this.userRepository.findByEmail(user.email);

  //   if (existingUser && existingUser.oauth != true) {
  //     if (existingUser.active === false) {
  //       throw new Error("Login blocked by admin");
  //     }

  //     await this.otpRepository.createOTP(otp);
  //     await this.sendOTPEmail(existingUser.email, otpCode);
  //     return {
  //       user: existingUser,
  //       oauth: false,
  //       message: "OTP sent for verification"
  //     };
  //   }

  //   const createdUser = await this.userRepository.createUser(user);
  //   await this.otpRepository.createOTP(otp);
  //   await this.sendOTPEmail(user.email, otpCode);

  //   return {
  //     user: createdUser,
  //     oauth: false,
  //     message: "OTP sent for verification"
  //   };
  // }
  async registerUser(userData) {
    const user = new User({
      email: userData.email,
      name: userData.name,
      image: userData.image,
      oauth: userData.oauth,
      signupMethod: this.signupSelector(Number(userData.method)),
      subscriptionType: 'free'
    });
  
    user.validate();
  
    const existingUser = await this.userRepository.findByEmail(user.email);
  

    if (existingUser) {
      if (JSON.parse(userData.oauth) && existingUser.signupMethod === "email" && existingUser.active !== true) {
        throw new Error("This email is already registered. Please login");
      }
      if (!JSON.parse(userData.oauth) && existingUser.signupMethod !== "email" && existingUser.active !== true) {
        throw new Error("This email is already registered with OAuth. Please login with OAuth.");
      }
    }
  
    if (JSON.parse(userData.oauth) == true) {
      if (existingUser) {
        if (existingUser.active === false) {
          throw new Error("Login blocked by admin");
        }
  
        const updatedUser = await this.userRepository.update(existingUser.id, {
          name: userData.name,
          image: userData.image,
          signupMethod: this.signupSelector(Number(userData.method))
        });
  
        const token = this.generateToken(updatedUser);
        return {
          user: updatedUser,
          token,
          oauth: true,
          message: "Login successful"
        };
      }
  
      user.isVerified = true;
      user.active = true;
      const createdUser = await this.userRepository.createUser(user);
      const token = this.generateToken(createdUser);
  
      return {
        user: createdUser,
        token,
        oauth: true,
        message: "Registration successful"
      };
    }
  
    // Non-OAuth flow
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
    const otp = new OTP({
      email: user.email,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true,
    });
  
    if (existingUser) {
      if (existingUser.active === false) {
        throw new Error("Login blocked by admin");
      }
  
      await this.otpRepository.createOTP(otp);
      await this.sendOTPEmail(existingUser.email, otpCode);
      return {
        user: existingUser,
        oauth: false,
        message: "OTP sent for verification"
      };
    }
  
    const createdUser = await this.userRepository.createUser(user);
    await this.otpRepository.createOTP(otp);
    await this.sendOTPEmail(user.email, otpCode);
  
    return {
      user: createdUser,
      oauth: false,
      message: "OTP sent for verification"
    };
  }  

  async resendOTP(email) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (JSON.parse(user.oauth) === true) {
      throw new Error("OAuth users do not require OTP verification");
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otp = new OTP({
      email: user.email,
      otpcode: otpCode,
      expires_at: expiresAt,
      isvalid: true,
    });

    await this.otpRepository.createOTP(otp);
    await this.sendOTPEmail(user.email, otpCode);

    return { success: true, message: "OTP resent successfully" };
  }

  async verifyUser(email, otpCode) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    // Skip OTP verification for OAuth users
    if (user.oauth === true) {
      const token = this.generateToken(user);
      return {
        success: true,
        token,
        oauth: true,
        message: "OAuth user verified successfully"
      };
    }

    // Regular OTP verification for non-OAuth users
    const otp = await this.otpRepository.findOTPByEmail(email);

    if (!otp || otp.otpCode !== otpCode) {
      throw new Error("Invalid OTP");
    }

    if (!otp.isValid) {
      await this.otpRepository.updateOTP(email, false);
      throw new Error("OTP has expired");
    }

    const verifiedUser = await this.userRepository.verifyEmail(email);
    await this.otpRepository.updateOTP(email, false);
  
    const token = this.generateToken(verifiedUser);
  
    return {
      success: true,
      token,
      oauth: false,
      message: "OTP verified successfully"
    };
  }

  async login(email,oauth) {
    try {
      const existingUser = await this.userRepository.findByEmail(email);

      if (!existingUser) {
        return { success: false, message: "No user found" };
      }

      if (existingUser.active === false) {
        return { success: false, message: "Login blocked by admin" };
      }

      if (["google", "apple"].includes(existingUser.signupMethod)) {
        return {
          success: false,
          message: `This email is linked with ${existingUser.signupMethod} sign-in. Please use ${existingUser.signupMethod} to log in.`
        };
      }
      

      // if (existingUser.signupMethod !== "email" && oauth == true) {
      //   const token = this.generateToken(existingUser);
      //   return {
      //     success: true,
      //     token,
      //     // oauth: true,
      //     message: "Login successful"
      //   };
      // }

      // Regular email login flow
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const otp = new OTP({
        email: email,
        otpcode: otpCode,
        expires_at: expiresAt,
        isvalid: true,
      });

      await this.otpRepository.createOTP(otp);
      await this.sendOTPEmail(existingUser.email, otpCode);
      
      return {
        success: true,
        oauth: false,
        message: "OTP sent to your email"
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Helper method to generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user?.name 
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
    return this.userRepository.findAll(filters);
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

  async updateUser(id, data) {
    return this.userRepository.update(id, data);
  }
}