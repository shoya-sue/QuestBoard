const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// セキュリティヘッダー設定
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://apis.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:3001"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// レート制限設定
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'リクエスト数が多すぎます。しばらく待ってから再試行してください。',
  standardHeaders: true,
  legacyHeaders: false,
});

// 認証試行の制限
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  skipSuccessfulRequests: true,
  message: '認証試行回数が上限に達しました。しばらく待ってから再試行してください。',
});

// ファイルアップロード制限
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'ファイルアップロード数が上限に達しました。',
});

module.exports = {
  securityHeaders,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  mongoSanitize,
};