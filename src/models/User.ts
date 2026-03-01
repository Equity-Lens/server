import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { User, UserResponse, CreateUserInput } from '../types';

const SALT_ROUNDS = 10;

export const UserModel = {
  // Create new user
  async create(data: CreateUserInput): Promise<UserResponse> {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;

    const values = [data.name, data.email, hashedPassword];
    const result = await pool.query(query, values);

    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);

    return result.rows[0] || null;
  },

  // Find user by ID
  async findById(id: number): Promise<UserResponse | null> {
    const query = `
      SELECT id, name, email, created_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    return result.rows[0] || null;
  },

  // Check if email exists
  async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)';
    const result = await pool.query(query, [email]);

    return result.rows[0].exists;
  },

  // Verify password
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // Store refresh token
  async storeRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `;
    await pool.query(query, [userId, token, expiresAt]);
  },

  // Find refresh token
  async findRefreshToken(token: string): Promise<any | null> {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  },

  // Delete refresh token
  async deleteRefreshToken(token: string): Promise<void> {
    const query = 'DELETE FROM refresh_tokens WHERE token = $1';
    await pool.query(query, [token]);
  },

  // Delete all user's refresh tokens
  async deleteUserRefreshTokens(userId: number): Promise<void> {
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
    await pool.query(query, [userId]);
  },

  // Clean expired tokens
  async cleanExpiredTokens(): Promise<void> {
    const query = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
    await pool.query(query);
  },
};

export default UserModel;