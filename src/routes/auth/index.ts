import express from 'express';
import authController from '../../controllers/authController';
import { authenticateToken } from '../../middleware/auth';
import {
  validateSignUp,
  validateSignIn,
  validateRefreshToken,
  handleValidationErrors,
} from '../../utils/validation';

const router = express.Router();

// Sign Up
router.post(
  '/signup',
  validateSignUp,
  handleValidationErrors,
  authController.signup
);

// Sign In
router.post(
  '/signin',
  validateSignIn,
  handleValidationErrors,
  authController.signin
);

// Refresh Token
router.post(
  '/refresh',
  validateRefreshToken,
  handleValidationErrors,
  authController.refreshToken
);

// Logout
router.post('/logout', authenticateToken, authController.logout);

// Get Current User
router.get('/me', authenticateToken, authController.me);

// Verify Token
router.get('/verify', authenticateToken, authController.verifyToken);

export default router;