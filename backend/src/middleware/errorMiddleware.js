const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  let userFriendlyMessage = err.message || 'Something went wrong while processing your request. Please try again.';
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    userFriendlyMessage = 'Something went wrong on our end. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    message: userFriendlyMessage,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
