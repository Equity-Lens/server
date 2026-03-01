import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // PostgreSQL errors
  if ((err as any).code) {
    const pgError = err as any;

    switch (pgError.code) {
      case '23505': // Unique violation
        res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
        return;

      case '23503': // Foreign key violation
        res.status(400).json({
          success: false,
          message: 'Invalid reference',
        });
        return;

      default:
        console.error('PostgreSQL Error:', pgError);
    }
  }

  // Unknown errors
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};