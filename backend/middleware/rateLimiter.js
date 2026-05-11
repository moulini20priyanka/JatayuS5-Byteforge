

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit'); // ← import helper

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator, // ← replaces your custom (req) => req.ip
  message: { error: 'Too many requests, please try again later.' },
});

module.exports = { aiRateLimiter };