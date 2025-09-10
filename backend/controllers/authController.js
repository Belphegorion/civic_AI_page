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
    const existing = await User.findOne({ email });
    if (existing) {
      logger.warn('Register attempt with existing email=%s', email);
      return next(new AppError('Email already registered', 400));
    }
    const user = await User.create({ name, email, password });
    logger.info('New user registered id=%s email=%s', user._id, user.email);
    res.status(201).json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('Register error: %s', err.message);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
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
  res.json(req.user);
};
