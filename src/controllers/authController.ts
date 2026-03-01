import { Response } from 'express';
import { AuthRequest, SignInInput, ApiResponse, AuthResponse } from '../types';
import UserModel from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const authController = {
  // Sign Up
  async signup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
        return;
      }

      // Create user
      const user = await UserModel.create({ name, email, password });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
      });
    }
  },

  // Sign In
  async signin(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe }: SignInInput = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

      await UserModel.storeRefreshToken(user.id, refreshToken, expiresAt);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sign in',
      });
    }
  },

  // Logout
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await UserModel.deleteRefreshToken(refreshToken);
      }

      // Delete all user's tokens if authenticated
      if (req.user) {
        await UserModel.deleteUserRefreshTokens(req.user.userId);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout',
      });
    }
  },

  // Refresh Token
  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token required',
        });
        return;
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if token exists in database
      const storedToken = await UserModel.findRefreshToken(refreshToken);
      if (!storedToken) {
        res.status(403).json({
          success: false,
          message: 'Invalid refresh token',
        });
        return;
      }

      // Generate new access token
      const newAccessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      });

      res.status(200).json({
        success: true,
        data: {
          token: newAccessToken,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }
  },

  // Get Current User
  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
      });
    }
  },

  // Verify Token (check if token is valid)
  async verifyToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
  },
};

export default authController;