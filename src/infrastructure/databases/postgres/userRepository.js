import { UserRepository } from '../../../domain/repositories/userRepository.js';

export class PostgresUserRepository extends UserRepository {
  constructor(sql) {
    super();
    this.sql = sql;
  }

  async create(user) {
    const result = await this.sql`
      INSERT INTO users (id, name, email, password, is_verified)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password}, ${user.isVerified})
      RETURNING *;
    `;
    return result[0];
  }

  async findByEmail(email) {
    const result = await this.sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    return result[0] || null;
  }

  async verifyEmail(email) {
    await this.sql`
      UPDATE users SET is_verified = TRUE WHERE email = ${email}
    `;
  }
}
