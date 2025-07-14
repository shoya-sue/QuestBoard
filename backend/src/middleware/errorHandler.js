const { captureError } = require('../config/sentry');
const { Logger, logError, logSecurity } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // 構造化ログでエラーを記録
  const errorContext = {
    userId: req.user?.id || null,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    sessionId: req.sessionID || null,
    body: req.method === 'POST' ? req.body : undefined,
    params: req.params,
    query: req.query
  };

  logError(err, errorContext);
  
  // Capture error with Sentry
  captureError(err, errorContext);

  // セキュリティ関連エラーの検出とログ
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logSecurity('Invalid JWT Token Access', {
      ...errorContext,
      tokenError: err.name
    });
  }

  // レート制限エラー
  if (err.statusCode === 429) {
    logSecurity('Rate Limit Exceeded', {
      ...errorContext,
      rateLimit: true
    });
  }

  // Sequelizeバリデーションエラー
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    Logger.warn('Validation Error', { ...errorContext, validationErrors: errors });
    
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: errors.map(e => e.message)
    });
  }

  // Sequelizeデータベースエラー
  if (err.name === 'SequelizeDatabaseError') {
    Logger.error('Database Error', { ...errorContext, dbError: err.parent?.message });
    
    return res.status(500).json({
      error: 'データベースエラーが発生しました',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Sequelize一意制約エラー
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    
    Logger.warn('Unique Constraint Violation', { ...errorContext, field });
    
    return res.status(400).json({
      error: `${field}は既に使用されています`
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
    Logger.warn('File Size Limit Exceeded', errorContext);
    
    return res.status(400).json({
      error: 'ファイルサイズが大きすぎます'
    });
  }

  // レート制限エラー
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: 'リクエストが多すぎます。しばらく待ってからやり直してください。'
    });
  }

  // 権限エラー
  if (err.statusCode === 403) {
    logSecurity('Access Denied', errorContext);
    
    return res.status(403).json({
      error: 'アクセスが拒否されました'
    });
  }

  // カスタムエラー
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // 予期しないエラー
  Logger.error('Unexpected Error', { 
    ...errorContext, 
    unexpectedError: true,
    errorType: err.constructor.name 
  });

  // その他のエラー
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;