export class CreateUserDTO {
    constructor({ name, email, password }) {
      this.name = name;
      this.email = email;
      this.password = password;
    }
  }
  
  export class VerifyUserDTO {
    constructor({ email, otp }) {
      this.email = email;
      this.otp = otp;
    }
  }