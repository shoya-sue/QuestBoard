const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

class EnvironmentConfig {
  constructor() {
    this.requiredVars = {
      // 必須環境変数
      production: [
        'JWT_SECRET',
        'DB_HOST',
        'DB_PASSWORD',
        'REDIS_PASSWORD',
        'SESSION_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET'
      ],
      // 開発環境でも必須
      all: [
        'JWT_SECRET',
        'DB_PASSWORD'
      ]
    };

    this.sensitiveVars = [
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
      'DB_PASSWORD',
      'REDIS_PASSWORD',
      'SESSION_SECRET',
      'GOOGLE_CLIENT_SECRET',
      'EMAIL_PASSWORD',
      'SENTRY_DSN',
      'AWS_SECRET_ACCESS_KEY',
      'ELASTICSEARCH_PASSWORD'
    ];
  }

  /**
   * 環境変数の検証
   */
  validateEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const errors = [];

    // 環境別の必須変数チェック
    const requiredVars = env === 'production' 
      ? this.requiredVars.production 
      : this.requiredVars.all;

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // 本番環境での追加チェック
    if (env === 'production') {
      // HTTPSチェック
      if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
        errors.push('FRONTEND_URL must use HTTPS in production');
      }

      // セキュリティ設定チェック
      if (process.env.SESSION_SECURE !== 'true') {
        errors.push('SESSION_SECURE must be true in production');
      }

      // JWTシークレットの強度チェック
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters in production');
      }
    }

    if (errors.length > 0) {
      logger.error('Environment validation failed:', errors);
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    logger.info('Environment validation passed');
  }

  /**
   * デフォルト値の設定
   */
  setDefaults() {
    const defaults = {
      // サーバー設定
      PORT: '3001',
      NODE_ENV: 'development',
      
      // データベース設定
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'postgres',
      DB_NAME: 'questboard',
      DB_SSL: 'false',
      DB_POOL_MIN: '2',
      DB_POOL_MAX: '10',
      
      // Redis設定
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_TLS: 'false',
      
      // セキュリティ設定
      BCRYPT_ROUNDS: '12',
      JWT_EXPIRES_IN: '24h',
      REFRESH_TOKEN_EXPIRES_IN: '7d',
      SESSION_MAX_AGE: '86400000',
      
      // レート制限
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      AUTH_RATE_LIMIT_MAX_REQUESTS: '5',
      
      // ログ設定
      LOG_LEVEL: 'info',
      LOG_MAX_SIZE: '20m',
      LOG_MAX_FILES: '14d',
      
      // 機能フラグ
      FEATURE_SOCIAL_LOGIN: 'true',
      FEATURE_TWO_FA: 'true',
      FEATURE_EMAIL_NOTIFICATIONS: 'false',
      FEATURE_WEBSOCKET: 'true',
      FEATURE_SEARCH: 'true',
      FEATURE_RATINGS: 'true'
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  /**
   * 環境変数の型変換
   */
  parseEnvironment() {
    // 数値型への変換
    const numericVars = [
      'PORT',
      'DB_PORT',
      'REDIS_PORT',
      'BCRYPT_ROUNDS',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'AUTH_RATE_LIMIT_MAX_REQUESTS',
      'SESSION_MAX_AGE',
      'REQUEST_TIMEOUT',
      'SOCKET_TIMEOUT',
      'MAX_UPLOAD_SIZE',
      'DB_POOL_MIN',
      'DB_POOL_MAX',
      'DB_POOL_IDLE',
      'DB_POOL_ACQUIRE',
      'DB_POOL_EVICT'
    ];

    for (const varName of numericVars) {
      if (process.env[varName]) {
        process.env[varName] = parseInt(process.env[varName], 10).toString();
      }
    }

    // Boolean型への変換
    const booleanVars = [
      'DB_SSL',
      'REDIS_TLS',
      'EMAIL_ENABLED',
      'FEATURE_SOCIAL_LOGIN',
      'FEATURE_TWO_FA',
      'FEATURE_EMAIL_NOTIFICATIONS',
      'FEATURE_WEBSOCKET',
      'FEATURE_SEARCH',
      'FEATURE_RATINGS',
      'FEATURE_MAINTENANCE_MODE',
      'HELMET_CSP_ENABLED',
      'SESSION_SECURE',
      'SESSION_HTTP_ONLY',
      'FORCE_HTTPS',
      'TRUST_PROXY',
      'DEBUG',
      'VERBOSE_LOGGING',
      'MOCK_AUTH',
      'METRICS_ENABLED',
      'BACKUP_ENABLED',
      'APM_ENABLED'
    ];

    for (const varName of booleanVars) {
      if (process.env[varName]) {
        process.env[varName] = process.env[varName] === 'true' ? 'true' : 'false';
      }
    }

    // 配列型への変換
    if (process.env.ADMIN_EMAILS) {
      process.env.ADMIN_EMAILS_ARRAY = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
    }
  }

  /**
   * セキュアな環境変数の生成
   */
  generateSecureValues() {
    const env = process.env.NODE_ENV || 'development';
    
    // 開発環境でのみ自動生成
    if (env !== 'development') {
      return;
    }

    // JWT_SECRETが未設定の場合、安全な値を生成
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('base64');
      logger.warn('JWT_SECRET was not set, generated a random value for development');
    }

    // SESSION_SECRETが未設定の場合、安全な値を生成
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString('base64');
      logger.warn('SESSION_SECRET was not set, generated a random value for development');
    }
  }

  /**
   * 環境変数のマスキング（ログ出力用）
   */
  getMaskedConfig() {
    const config = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('npm_') || key.startsWith('NODE_')) {
        continue;
      }
      
      if (this.sensitiveVars.includes(key)) {
        config[key] = value ? '***MASKED***' : undefined;
      } else {
        config[key] = value;
      }
    }
    
    return config;
  }

  /**
   * 環境設定の初期化
   */
  initialize() {
    try {
      // デフォルト値の設定
      this.setDefaults();
      
      // 環境変数の型変換
      this.parseEnvironment();
      
      // セキュアな値の生成（開発環境のみ）
      this.generateSecureValues();
      
      // 環境変数の検証
      this.validateEnvironment();
      
      // 設定内容のログ出力（機密情報はマスク）
      if (process.env.VERBOSE_LOGGING === 'true') {
        logger.info('Environment configuration:', this.getMaskedConfig());
      }
      
      logger.info(`Environment initialized for ${process.env.NODE_ENV} mode`);
    } catch (error) {
      logger.error('Failed to initialize environment:', error);
      throw error;
    }
  }

  /**
   * 設定値の取得
   */
  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  /**
   * Boolean設定値の取得
   */
  getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    return value === 'true';
  }

  /**
   * 数値設定値の取得
   */
  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    return parseInt(value, 10);
  }

  /**
   * 配列設定値の取得
   */
  getArray(key, defaultValue = []) {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }
    return value.split(',').map(item => item.trim());
  }

  /**
   * 機能フラグの確認
   */
  isFeatureEnabled(feature) {
    const key = `FEATURE_${feature.toUpperCase()}`;
    return this.getBoolean(key, false);
  }
}

// シングルトンインスタンス
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;