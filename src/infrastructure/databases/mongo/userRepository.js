import { UserRepository, OTPRepository } from '../../../domain/repositories/userRepository.js';

export class MongoUserRepository extends UserRepository {
  constructor(client) {
    super();
    this.db = client.db('user_service');
    this.collection = this.db.collection('users');
  }

  async create(user) {
    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  async findByEmail(email) {
    return await this.collection.findOne({ email });
  }

  async verifyEmail(email) {
    await this.collection.updateOne(
      { email },
      { $set: { isVerified: true } }
    );
  }
}

export class MongoOTPRepository extends OTPRepository {
  constructor(client) {
    super();
    this.db = client.db('user_service');
    this.collection = this.db.collection('otps');
  }

  async createOTP(otp) {
    await this.collection.insertOne(otp);
  }

  async findOTPByEmail(email) {
    const doc = await this.collection.findOne({ email });
    return doc ? new OTP(doc) : null;
  }

  async deleteOTP(email) {
    await this.collection.deleteOne({ email });
  }
}