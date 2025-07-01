const CustomError = require("../../Helpers/error/CustomError")

const customErrorHandler = (err, req, res, next) => {
    // Ensure err is an object
    if (!err) {
        err = new CustomError("Unknown error occurred", 500);
    }

    // Convert string errors to CustomError objects
    if (typeof err === 'string') {
        err = new CustomError(err, 500);
    }

    // Handle specific error types
    if (err.code === 11000) {
        err = new CustomError("Duplicate field value entered", 400);
    }

    if (err.name === 'SyntaxError') {
        err = new CustomError('Invalid JSON syntax', 400);
    }

    if (err.name === 'ValidationError') {
        err = new CustomError(err.message || 'Validation failed', 400);
    }

    if (err.name === "CastError") {
        err = new CustomError("Please provide a valid ID", 400);
    }

    if (err.name === "TokenExpiredError") {
        err = new CustomError("JWT token has expired", 401);
    }

    if (err.name === "JsonWebTokenError") {
        err = new CustomError("Invalid JWT token", 401);
    }

    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        err = new CustomError("File size too large", 400);
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        err = new CustomError("Unexpected file field", 400);
    }

    // Handle Cloudinary errors
    if (err.name === 'CloudinaryError') {
        err = new CustomError("File upload failed: " + (err.message || 'Unknown cloudinary error'), 400);
    }

    // Log error details for debugging
    console.log("Custom Error Handler =>", {
        name: err.name || 'Unknown',
        message: err.message || 'No message',
        statusCode: err.statusCode || 500,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Ensure we have proper error properties
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";

    return res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};


module.exports = customErrorHandler
