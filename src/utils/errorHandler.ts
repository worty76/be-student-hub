import { Request, Response, NextFunction } from 'express';

// Custom error class
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

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Something went wrong';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    console.error('ERROR 💥', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message: message,
  });
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`,
  });
}; 