// server/src/controllers/calendarController.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as calendarService from '../services/calendarService';
import { AppError } from '../middleware/errorHandler';

export const getEarningsCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to, symbol, international } = req.query;

    // Validate required parameters
    if (!from || !to) {
      throw new AppError('Missing required parameters: from and to dates are required', 400);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from as string) || !dateRegex.test(to as string)) {
      throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);
    }

    const earningsData = await calendarService.fetchEarningsCalendar({
      from: from as string,
      to: to as string,
      symbol: symbol as string | undefined,
      international: international === 'true',
      userId: req.user?.userId.toString()
    });

    res.json({
      success: true,
      data: earningsData
    });
  } catch (error) {
    next(error);
  }
};

export const getEarningsForSymbol = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { limit = '10' } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const earningsHistory = await calendarService.fetchEarningsForSymbol(
      symbol.toUpperCase(),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        earningsHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingEarnings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const upcomingEarnings = await calendarService.fetchUpcomingEarnings();
    
    res.json({
      success: true,
      data: upcomingEarnings
    });
  } catch (error) {
    next(error);
  }
};


export const clearEarningsCache = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    await calendarService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};