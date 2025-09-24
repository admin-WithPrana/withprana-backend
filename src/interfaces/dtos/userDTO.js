export class CreateUserDTO {
    constructor({ name, email, image, oauth, method }) {
      this.name = name;
      this.email = email;
      this.image = image;
      this.oauth = oauth;
      this.method = method;
    }
  }
  
  export class VerifyUserDTO {
    constructor({ email, otp }) {
      this.email = email;
      this.otp = otp;
    }
  }