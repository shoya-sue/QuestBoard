/**
 * セキュリティヘッダー設定ミドルウェア
 * Express.jsアプリケーション用のセキュリティヘッダーを設定
 */

const helmet = require('helmet');

/**
 * セキュリティヘッダー設定を返すファクトリー関数
 */
function createSecurityHeaders(options = {}) {
  const {
    environment = 'production',
    allowInlineScripts = false,
    allowInlineStyles = false,
    reportUri = null,
    trustedDomains = []
  } = options;

  const isProduction = environment === 'production';

  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Bootstrap等のインラインスタイルのため
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        scriptSrc: [
          "'self'",
          ...(allowInlineScripts ? ["'unsafe-inline'"] : []),
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
          ...(isProduction ? [] : ["'unsafe-eval'"]) // 開発環境でのみeval許可
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'blob:'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        connectSrc: [
          "'self'",
          'https://api.questboard.com',
          'wss://api.questboard.com',
          ...trustedDomains
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        childSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        ...(reportUri && { reportUri: [reportUri] })
      },
      reportOnly: !isProduction // 本番環境以外はレポートのみ
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options (Clickjacking対策)
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: ['no-referrer-when-downgrade']
    },

    // Permission Policy (旧Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      speaker: [],
      vibrate: [],
      fullscreen: ['self'],
      notifications: ['self']
    },

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // 必要に応じて有効化

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },

    // X-Powered-By ヘッダーを削除
    hidePoweredBy: true,

    // Expect-CT (非推奨だが後方互換性のため)
    expectCt: {
      maxAge: 86400,
      enforce: isProduction,
      reportUri: reportUri
    }
  };
}

/**
 * Express.jsアプリケーションにセキュリティヘッダーを適用
 */
function applySecurityHeaders(app, options = {}) {
  const config = createSecurityHeaders(options);
  
  // Helmetを使用してセキュリティヘッダーを設定
  app.use(helmet(config));

  // カスタムセキュリティヘッダー
  app.use((req, res, next) => {
    // Security.txt の設定
    res.setHeader('Security-Policy', 'https://questboard.com/.well-known/security.txt');
    
    // カスタムセキュリティヘッダー
    res.setHeader('X-Content-Security-Policy', res.getHeader('Content-Security-Policy') || '');
    res.setHeader('X-WebKit-CSP', res.getHeader('Content-Security-Policy') || '');
    
    // タイミング攻撃対策
    res.setHeader('X-Response-Time', Date.now() - req.startTime);
    
    // リクエストID（デバッグ用）
    if (!options.hideRequestId) {
      res.setHeader('X-Request-ID', req.id || 'unknown');
    }

    next();
  });

  // APIレスポンス用の追加ヘッダー
  app.use('/api/*', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // 静的ファイル用のキャッシュヘッダー
  app.use('/static/*', (req, res, next) => {
    if (options.environment === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    next();
  });
}

/**
 * セキュリティヘッダーの検証
 */
function validateSecurityHeaders(headers) {
  const required = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'content-security-policy',
    'referrer-policy'
  ];

  const missing = required.filter(header => !headers[header]);
  const warnings = [];

  if (missing.length > 0) {
    warnings.push(`Missing security headers: ${missing.join(', ')}`);
  }

  // HSTS設定の検証
  const hsts = headers['strict-transport-security'];
  if (hsts) {
    if (!hsts.includes('max-age=')) {
      warnings.push('HSTS header missing max-age directive');
    }
    if (!hsts.includes('includeSubDomains')) {
      warnings.push('HSTS header missing includeSubDomains directive');
    }
  }

  // CSP設定の検証
  const csp = headers['content-security-policy'];
  if (csp) {
    if (csp.includes("'unsafe-inline'") && csp.includes('script-src')) {
      warnings.push('CSP allows unsafe-inline scripts');
    }
    if (csp.includes("'unsafe-eval'")) {
      warnings.push('CSP allows unsafe-eval');
    }
  }

  // フレーミング保護の検証
  const frameOptions = headers['x-frame-options'];
  if (frameOptions && frameOptions.toLowerCase() === 'allow-from') {
    warnings.push('X-Frame-Options uses deprecated ALLOW-FROM directive');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    missing
  };
}

/**
 * セキュリティヘッダーのテスト用レスポンス関数
 */
function createSecurityTestResponse() {
  return (req, res) => {
    const validation = validateSecurityHeaders(res.getHeaders());
    
    res.json({
      headers: res.getHeaders(),
      validation,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    });
  };
}

/**
 * ミドルウェア関数をエクスポート
 */
module.exports = {
  createSecurityHeaders,
  applySecurityHeaders,
  validateSecurityHeaders,
  createSecurityTestResponse
};