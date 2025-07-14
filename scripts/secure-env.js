#!/usr/bin/env node

/**
 * 環境変数のセキュア管理スクリプト
 * 使用方法:
 *   node scripts/secure-env.js encrypt .env .env.encrypted
 *   node scripts/secure-env.js decrypt .env.encrypted
 *   node scripts/secure-env.js validate .env
 *   node scripts/secure-env.js generate-secrets
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { promisify } = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

class SecureEnvManager {
  constructor() {
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
      'ELASTICSEARCH_PASSWORD',
      'SLACK_WEBHOOK_URL',
      'PAGERDUTY_SERVICE_KEY'
    ];
  }

  /**
   * 環境変数ファイルの暗号化
   */
  async encryptEnvFile(inputPath, outputPath) {
    try {
      console.log('🔐 Encrypting environment file...');
      
      const password = await question('Enter encryption password: ');
      const confirmPassword = await question('Confirm password: ');
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const content = await fs.readFile(inputPath, 'utf8');
      const secretsManager = require('../backend/src/utils/secrets');
      
      const encrypted = await secretsManager.encrypt(content, password);
      
      const output = {
        version: '1.0',
        algorithm: 'aes-256-gcm',
        encrypted: encrypted,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
      console.log(`✅ Environment file encrypted successfully: ${outputPath}`);
      
    } catch (error) {
      console.error('❌ Encryption failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * 環境変数ファイルの復号化
   */
  async decryptEnvFile(inputPath) {
    try {
      console.log('🔓 Decrypting environment file...');
      
      const password = await question('Enter decryption password: ');
      
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);
      
      const secretsManager = require('../backend/src/utils/secrets');
      const decrypted = await secretsManager.decrypt(data.encrypted, password);
      
      console.log('\n--- Decrypted Environment Variables ---');
      console.log(this.maskSensitiveValues(decrypted));
      console.log('--- End ---\n');
      
      const save = await question('Save to file? (y/n): ');
      if (save.toLowerCase() === 'y') {
        const outputPath = await question('Output file path: ');
        await fs.writeFile(outputPath, decrypted, { mode: 0o600 });
        console.log(`✅ Saved to: ${outputPath}`);
      }
      
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * 環境変数の検証
   */
  async validateEnvFile(envPath) {
    try {
      console.log('🔍 Validating environment file...');
      
      const content = await fs.readFile(envPath, 'utf8');
      const lines = content.split('\n');
      const issues = [];
      const vars = {};
      
      // 各行を解析
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line || line.startsWith('#')) continue;
        
        const match = line.match(/^([A-Z_]+[A-Z0-9_]*)=(.*)$/);
        if (!match) {
          issues.push(`Line ${i + 1}: Invalid format - ${line}`);
          continue;
        }
        
        const [, key, value] = match;
        vars[key] = value;
        
        // 値のチェック
        if (!value || value === 'your-' + key.toLowerCase()) {
          issues.push(`${key}: Default/placeholder value detected`);
        }
        
        // セキュリティチェック
        if (this.sensitiveVars.includes(key)) {
          if (value.length < 32) {
            issues.push(`${key}: Value too short (minimum 32 characters recommended)`);
          }
          if (value.includes(' ')) {
            issues.push(`${key}: Contains spaces (may cause issues)`);
          }
        }
      }
      
      // 必須変数のチェック
      const requiredVars = ['JWT_SECRET', 'DB_PASSWORD'];
      for (const varName of requiredVars) {
        if (!vars[varName]) {
          issues.push(`${varName}: Required variable is missing`);
        }
      }
      
      // 結果表示
      if (issues.length === 0) {
        console.log('✅ Environment file is valid!');
      } else {
        console.log(`\n❌ Found ${issues.length} issue(s):\n`);
        issues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      // 統計情報
      console.log(`\n📊 Statistics:`);
      console.log(`  Total variables: ${Object.keys(vars).length}`);
      console.log(`  Sensitive variables: ${this.sensitiveVars.filter(v => vars[v]).length}`);
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * セキュアな値の生成
   */
  async generateSecrets() {
    console.log('🔑 Generating secure values...\n');
    
    const secrets = {
      JWT_SECRET: crypto.randomBytes(32).toString('base64'),
      REFRESH_TOKEN_SECRET: crypto.randomBytes(32).toString('base64'),
      SESSION_SECRET: crypto.randomBytes(32).toString('base64'),
      DB_PASSWORD: this.generatePassword(20),
      REDIS_PASSWORD: this.generatePassword(20),
      ADMIN_PASSWORD: this.generatePassword(16),
      API_KEY: `qb_${Date.now().toString(36)}_${crypto.randomBytes(16).toString('hex')}`
    };
    
    console.log('Generated secure values:\n');
    for (const [key, value] of Object.entries(secrets)) {
      console.log(`${key}=${value}`);
    }
    
    console.log('\n⚠️  Save these values securely and update your .env file');
  }

  /**
   * パスワード生成
   */
  generatePassword(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
  }

  /**
   * 機密値のマスキング
   */
  maskSensitiveValues(content) {
    let masked = content;
    
    for (const varName of this.sensitiveVars) {
      const regex = new RegExp(`(${varName}=)(.+)`, 'gm');
      masked = masked.replace(regex, (match, prefix, value) => {
        if (value.length > 8) {
          return `${prefix}${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
        }
        return `${prefix}****`;
      });
    }
    
    return masked;
  }
}

// メイン処理
async function main() {
  const manager = new SecureEnvManager();
  const [,, command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'encrypt':
        if (args.length < 2) {
          console.error('Usage: secure-env.js encrypt <input> <output>');
          process.exit(1);
        }
        await manager.encryptEnvFile(args[0], args[1]);
        break;
        
      case 'decrypt':
        if (args.length < 1) {
          console.error('Usage: secure-env.js decrypt <input>');
          process.exit(1);
        }
        await manager.decryptEnvFile(args[0]);
        break;
        
      case 'validate':
        if (args.length < 1) {
          console.error('Usage: secure-env.js validate <env-file>');
          process.exit(1);
        }
        await manager.validateEnvFile(args[0]);
        break;
        
      case 'generate-secrets':
        await manager.generateSecrets();
        break;
        
      default:
        console.log('Quest Board Secure Environment Manager\n');
        console.log('Commands:');
        console.log('  encrypt <input> <output>  - Encrypt environment file');
        console.log('  decrypt <input>          - Decrypt environment file');
        console.log('  validate <env-file>      - Validate environment file');
        console.log('  generate-secrets         - Generate secure random values');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();