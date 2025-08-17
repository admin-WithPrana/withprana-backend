import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthUsecase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async login({ email, password }) {
    const admin = await this.authRepository.findByEmail(email);
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    if (!admin.active) {
      throw new Error('Admin account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, isSuper: admin.isSuper },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return { token };
  }
}
