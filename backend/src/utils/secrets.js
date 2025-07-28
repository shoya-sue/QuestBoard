const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { Logger: logger } = require('./logger');

class SecretsManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 64;
    this.iterations = 100000;
  }

  /**
   * マスターキーの生成または取得
   */
  async getMasterKey() {
    const keyPath = path.join(__dirname, '../../.master.key');
    
    try {
      // 既存のキーを読み込む
      const key = await fs.readFile(keyPath, 'utf8');
      return Buffer.from(key, 'hex');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // キーが存在しない場合は生成
        const key = crypto.randomBytes(this.keyLength);
        await fs.writeFile(keyPath, key.toString('hex'), { mode: 0o600 });
        logger.info('Master key generated');
        return key;
      }
      throw error;
    }
  }

  /**
   * 文字列の暗号化
   */
  async encrypt(text, password = null) {
    try {
      const masterKey = password ? 
        this.deriveKey(password) : 
        await this.getMasterKey();
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      // IV + タグ + 暗号化データを結合
      const combined = Buffer.concat([iv, tag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 文字列の復号化
   */
  async decrypt(encryptedData, password = null) {
    try {
      const masterKey = password ? 
        this.deriveKey(password) : 
        await this.getMasterKey();
      
      const combined = Buffer.from(encryptedData, 'base64');
      
      // IV、タグ、暗号化データを分離
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, masterKey, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * パスワードからキーを導出
   */
  deriveKey(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.saltLength);
    }
    
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * ハッシュの生成
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * セキュアなランダム文字列の生成
   */
  generateSecureToken(length = 32) {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .slice(0, length);
  }

  /**
   * APIキーの生成
   */
  generateApiKey(prefix = 'qb') {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateSecureToken(24);
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * パスワードの強度チェック
   */
  checkPasswordStrength(password) {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    
    return {
      score,
      requirements,
      strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
      isValid: score >= 3
    };
  }

  /**
   * 環境変数の暗号化
   */
  async encryptEnvFile(envPath, outputPath) {
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const lines = envContent.split('\n');
      const encryptedLines = [];
      
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          
          // 機密性の高い変数のみ暗号化
          if (this.isSensitiveVar(key)) {
            const encryptedValue = await this.encrypt(value);
            encryptedLines.push(`${key}=ENC:${encryptedValue}`);
          } else {
            encryptedLines.push(line);
          }
        } else {
          encryptedLines.push(line);
        }
      }
      
      await fs.writeFile(outputPath, encryptedLines.join('\n'), { mode: 0o600 });
      logger.info('Environment file encrypted successfully');
    } catch (error) {
      logger.error('Failed to encrypt environment file:', error);
      throw error;
    }
  }

  /**
   * 環境変数の復号化
   */
  async decryptEnvFile(envPath) {
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const lines = envContent.split('\n');
      const decryptedVars = {};
      
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          
          if (value.startsWith('ENC:')) {
            const encryptedValue = value.substring(4);
            decryptedVars[key] = await this.decrypt(encryptedValue);
          } else {
            decryptedVars[key] = value;
          }
        }
      }
      
      return decryptedVars;
    } catch (error) {
      logger.error('Failed to decrypt environment file:', error);
      throw error;
    }
  }

  /**
   * 機密性の高い環境変数かどうかの判定
   */
  isSensitiveVar(varName) {
    const sensitivePatterns = [
      /SECRET/i,
      /PASSWORD/i,
      /KEY/i,
      /TOKEN/i,
      /PRIVATE/i,
      /CREDENTIAL/i,
      /AUTH/i,
      /DSN/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(varName));
  }

  /**
   * セキュリティヘッダーの生成
   */
  generateSecurityHeaders() {
    const nonce = this.generateSecureToken(16);
    
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.questboard.com wss://api.questboard.com; frame-ancestors 'none';`,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'X-Nonce': nonce
    };
  }

  /**
   * HMAC署名の生成
   */
  generateHmac(data, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * HMAC署名の検証
   */
  verifyHmac(data, signature, secret) {
    const expectedSignature = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// シングルトンインスタンス
const secretsManager = new SecretsManager();

module.exports = secretsManager;