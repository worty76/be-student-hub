"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Something went wrong';
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else {
        console.error('ERROR 💥', err);
    }
    res.status(statusCode).json({
        status: 'error',
        message: message,
    });
};
exports.errorHandler = errorHandler;
// 404 Not Found handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.originalUrl} on this server!`,
    });
};
exports.notFoundHandler = notFoundHandler;
