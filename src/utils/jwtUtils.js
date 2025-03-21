const jwt = require("jsonwebtoken");
const Session = require("../models/sessionModel");


const generateAccessToken = (user, sessionId) => {
  const payload = {
    userId: user._id,
    role: user.role,
    email: user.email,
    phoneNumber: user.phoneNumber,
    // for sub-admins, include specific permissions
    permissions: user.role === "sub_admin" ? user.adminPermissions : [],
     // Include session identifier for token revocation
    sessionId: sessionId,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(
    payload, 
    process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN });
};

// Generate refresh token
const generateRefreshToken = (user, sessionId) => {
  const payload = {
    userId: user._id,
    sessionId: sessionId,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );
};


// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error("Invalid access token");
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

// Create session for user
const createSession = async (user, device, ipAddress) => {
  // Calculate expiry date for seession 
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Create new session
  const session = await Session.create({
    userId: user._id,
    token: '', // will be updated after token generation
    device,
    ipAddress,
    lastActive: new Date(),
    expiresAt,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user, session._id);
  const refreshToken = generateRefreshToken(user, session._id);

  // Update session with tokens
  session.token = refreshToken;
  await session.save();

  return {
    session,
    accessToken,
    refreshToken,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createSession,
};




