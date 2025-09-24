export class User {
    constructor({ id, name, email, image, oauth, signupMethod, subscriptionType, isVerified = false }) {
      // this.id = id;
      this.name = name;
      this.email = email;
      this.image = image;
      this.oauth = oauth;
      this.signupMethod = signupMethod; // 'email', 'google', 'apple'
      this.subscriptionType = subscriptionType; // 'free', 'premium',
      this.isVerified = isVerified;
      this.active = false;
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