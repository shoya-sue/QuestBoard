const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const { doubleCsrf } = require('csrf-csrf');

// レート制限の設定
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // デフォルト15分
    max: max || 100, // デフォルト100リクエスト
    message: message || 'リクエストが多すぎます。しばらくしてから再度お試しください。',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 一般的なAPIレート制限
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);

// 認証関連の厳しいレート制限
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分
  5, // 5回まで
  '認証リクエストが多すぎます。15分後に再度お試しください。'
);

// ファイルアップロード用のレート制限
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1時間
  10, // 10回まで
  'アップロードリクエストが多すぎます。1時間後に再度お試しください。'
);

// Helmetの設定
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// セッションの設定
const sessionConfig = session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24時間
  },
  name: 'qb.sid', // デフォルトの'connect.sid'から変更
});

// CSRF保護の設定（Double Submit Cookie Pattern）
const {
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

// CSRFトークンを生成してレスポンスに含める
const csrfToken = (req, res, next) => {
  const token = generateToken(req, res);
  res.locals.csrfToken = token;
  res.setHeader('X-CSRF-Token', token);
  next();
};

// CSRF保護ミドルウェア
const csrfProtection = doubleCsrfProtection;

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  helmetConfig,
  sessionConfig,
  csrfProtection,
  csrfToken,
  generateToken,
  validateRequest,
};