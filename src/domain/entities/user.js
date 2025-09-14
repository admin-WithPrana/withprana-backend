export class User {
    constructor({ id, name, email, password, isVerified = false }) {
      // this.id = id;
      this.name = name;
      this.email = email;
      this.password = password;
      // this.isVerified = isVerified;
    }
  
    validate() {
      if (!this.email) {
        throw new Error('Email is required');
      }
      // Add more validation as needed
    }
  }
  
  export class OTP {
    constructor({ email, otpcode, expires_at,isvalid,id}) {
      this.email = email;
      this.otpcode = otpcode;
      this.expires_at = expires_at;
      this.isvalid = isvalid;
      this.id = id;
    }
  
    isValid() {
      return new Date() < new Date(this.expires_at);
    }
  }