// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET not set in environment variables');
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign({ id }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email, and password', 400));
    }

    await User.create({ name, email, password });
    logger.info('New user registered email=%s', email);

    // Always return the same generic message to prevent user enumeration
    res.status(201).json({ message: 'Registration successful. Please proceed to login.' });

  } catch (err) {
    // Check for MongoDB duplicate key error
    if (err.code === 11000) {
      logger.warn('Registration attempt with existing email=%s. Responding with generic success message to prevent enumeration.', req.body.email);
      // Still return a "successful" response to prevent user enumeration
      return res.status(201).json({ message: 'Registration successful. Please proceed to login.' });
    }

    logger.error('Register error: %s', err.message);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password'); // Explicitly select password
    if (!user) {
      logger.warn('Login failed for email=%s', email);
      return next(new AppError('Invalid credentials', 401));
    }
    const match = await user.matchPassword(password);
    if (!match) {
      logger.warn('Login failed for email=%s - bad password', email);
      return next(new AppError('Invalid credentials', 401));
    }
    logger.info('User logged in id=%s email=%s', user._id, user.email);
    res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('Login error: %s', err.message);
    next(err);
  }
};

exports.me = async (req, res) => {
  // req.user is populated by the 'protect' middleware
  if (!req.user) {
    return next(new AppError('User not found', 404));
  }
  res.json(req.user);
};
