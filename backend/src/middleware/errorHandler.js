const { captureError } = require('../config/sentry');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Capture error with Sentry
  captureError(err, {
    user: req.user,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Mongooseバリデーションエラー
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: errors
    });
  }

  // JWT関連のエラー
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '無効なトークンです'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'トークンの有効期限が切れています'
    });
  }

  // ファイルアップロードエラー
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'ファイルサイズが大きすぎます'
    });
  }

  // 重複エラー
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field}は既に使用されています`
    });
  }

  // カスタムエラー
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // その他のエラー
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;