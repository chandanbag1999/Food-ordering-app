const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Session = require("../models/sessionModel");
const { verifyAccessToken } = require("../utils/jwtUtils");


/**
 * Middleware to protect routes
 * Verifies JWT token and attaches user to request
 */


const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    };

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token provided"
      });
    };


    try {
      // Verify token
      const decoded = verifyAccessToken(token);

      // Check if session exists and valid
      const session = await Session.findById(decoded.sessionId);
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Your session has expired, please login again"
        });
      };

      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      };

      // Check user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Your account is not active, please contact support"
        });
      };
      
      // Update session last active time
      session.lastActive = new Date();
      await session.save();

      // Attach user and session to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        error: error.message
      });
    };
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


//  Middleware to restrict access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    };
    
    next();
  }
};

// Middleware to check if user has specific permission
const hasPermission = (permission) => {
  return (req, res, next) => {
    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    };

    // For sub_admin, check specific permissions assigned
    if (req.user.role === 'sub_admin') {
      if (req.user.adminPermissions && req.user.adminPermissions.includes(permission)) {
        return next();
      };
    };

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action'
    });

  };
};




module.exports = {
  protect,
  authorize,
  hasPermission
};


