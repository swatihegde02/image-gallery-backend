const errorHandler = (err, req, res, next) => {
    console.error("Error:", err.message || err);
  
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      status: false,
      error: err.message || "Internal server error",
    });
  };
  
  module.exports = errorHandler;
  