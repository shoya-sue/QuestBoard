#!/usr/bin/env node

/**
 * セキュリティ監査スクリプト
 * アプリケーションの包括的なセキュリティチェックを実行
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.results = {
      vulnerabilities: [],
      warnings: [],
      info: [],
      score: 0,
      maxScore: 0
    };
    this.rootDir = path.join(__dirname, '..');
  }

  /**
   * セキュリティ監査の実行
   */
  async runAudit() {
    console.log('🔍 セキュリティ監査を開始...\n');

    await this.checkDependencyVulnerabilities();
    await this.checkSecretExposure();
    await this.checkSQLInjection();
    await this.checkXSSVulnerabilities();
    await this.checkCSRFProtection();
    await this.checkAuthenticationSecurity();
    await this.checkConfigurationSecurity();
    await this.checkDockerSecurity();
    await this.checkHTTPSSecurity();
    await this.checkInputValidation();
    await this.checkLoggingSecurity();
    await this.checkFilePermissions();

    this.generateReport();
  }

  /**
   * 依存関係の脆弱性チェック
   */
  async checkDependencyVulnerabilities() {
    console.log('📦 依存関係の脆弱性をチェック中...');
    
    try {
      // npm audit
      const backendAudit = this.runCommand('cd backend && npm audit --json', true);
      const frontendAudit = this.runCommand('cd frontend && npm audit --json', true);
      
      [backendAudit, frontendAudit].forEach((audit, index) => {
        const component = index === 0 ? 'Backend' : 'Frontend';
        if (audit) {
          const auditData = JSON.parse(audit);
          if (auditData.metadata && auditData.metadata.vulnerabilities) {
            const vulns = auditData.metadata.vulnerabilities;
            const total = vulns.total || 0;
            
            if (total > 0) {
              this.addVulnerability('high', `${component}: ${total}個の既知の脆弱性が発見されました`);
            } else {
              this.addInfo(`${component}: 依存関係に脆弱性は見つかりませんでした`);
              this.addScore(10);
            }
          }
        }
      });
    } catch (error) {
      this.addWarning('依存関係の監査に失敗しました: ' + error.message);
    }
  }

  /**
   * シークレット漏洩チェック
   */
  async checkSecretExposure() {
    console.log('🔐 シークレット漏洩をチェック中...');
    
    const secretPatterns = [
      { name: 'API Key', pattern: /(?:api[_-]?key|apikey)[\s]*[:=][\s]*['"]*([a-zA-Z0-9_\-]{20,})['"]*/ },
      { name: 'AWS Secret', pattern: /(?:aws[_-]?secret|aws[_-]?access[_-]?key)[\s]*[:=][\s]*['"]*([a-zA-Z0-9\/\+=]{20,})['"]*/ },
      { name: 'JWT Secret', pattern: /(?:jwt[_-]?secret|jwt[_-]?key)[\s]*[:=][\s]*['"]*([a-zA-Z0-9_\-]{20,})['"]*/ },
      { name: 'Database Password', pattern: /(?:db[_-]?pass|database[_-]?password)[\s]*[:=][\s]*['"]*([^'"]{8,})['"]*/ },
      { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/ }
    ];

    const filesToCheck = this.getJavaScriptFiles();
    let secretsFound = false;

    filesToCheck.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        secretPatterns.forEach(({ name, pattern }) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addVulnerability('critical', `${name}がソースコードに含まれています: ${file}`);
            secretsFound = true;
          }
        });
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (!secretsFound) {
      this.addInfo('ソースコードにシークレットは見つかりませんでした');
      this.addScore(15);
    }
  }

  /**
   * SQLインジェクション脆弱性チェック
   */
  async checkSQLInjection() {
    console.log('💉 SQLインジェクション脆弱性をチェック中...');
    
    const vulnerablePatterns = [
      /query\s*\(\s*[`'"][^`'"]*\$\{[^}]+\}[^`'"]*[`'"]\s*\)/,
      /query\s*\(\s*[`'"][^`'"]*\+[^`'"]*[`'"]\s*\)/,
      /SELECT\s+.*\+.*FROM/i,
      /INSERT\s+.*\+.*VALUES/i,
      /UPDATE\s+.*SET.*\+/i,
      /DELETE\s+.*WHERE.*\+/i
    ];

    const backendFiles = this.getJavaScriptFiles().filter(f => f.includes('/backend/'));
    let vulnerabilitiesFound = false;

    backendFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        vulnerablePatterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.addVulnerability('high', `SQLインジェクション脆弱性の可能性: ${file}`);
            vulnerabilitiesFound = true;
          }
        });
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (!vulnerabilitiesFound) {
      this.addInfo('SQLインジェクション脆弱性は見つかりませんでした');
      this.addScore(15);
    }
  }

  /**
   * XSS脆弱性チェック
   */
  async checkXSSVulnerabilities() {
    console.log('🕷️ XSS脆弱性をチェック中...');
    
    const xssPatterns = [
      /innerHTML\s*=\s*[^;]*\+/,
      /outerHTML\s*=\s*[^;]*\+/,
      /insertAdjacentHTML\s*\([^)]*\+/,
      /document\.write\s*\([^)]*\+/,
      /dangerouslySetInnerHTML/
    ];

    const frontendFiles = this.getJavaScriptFiles().filter(f => f.includes('/frontend/'));
    let vulnerabilitiesFound = false;

    frontendFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        xssPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.addVulnerability('medium', `XSS脆弱性の可能性: ${file}`);
            vulnerabilitiesFound = true;
          }
        });
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (!vulnerabilitiesFound) {
      this.addInfo('XSS脆弱性は見つかりませんでした');
      this.addScore(10);
    }
  }

  /**
   * CSRF保護チェック
   */
  async checkCSRFProtection() {
    console.log('🛡️ CSRF保護をチェック中...');
    
    try {
      const appFile = path.join(this.rootDir, 'backend/src/app.js');
      if (fs.existsSync(appFile)) {
        const content = fs.readFileSync(appFile, 'utf8');
        
        if (content.includes('csrf') || content.includes('csurf')) {
          this.addInfo('CSRF保護が実装されています');
          this.addScore(10);
        } else {
          this.addWarning('CSRF保護が実装されていない可能性があります');
        }
      }
    } catch (error) {
      this.addWarning('CSRF保護のチェックに失敗しました');
    }
  }

  /**
   * 認証セキュリティチェック
   */
  async checkAuthenticationSecurity() {
    console.log('🔑 認証セキュリティをチェック中...');
    
    const authFiles = this.getJavaScriptFiles().filter(f => 
      f.includes('auth') || f.includes('login') || f.includes('password')
    );

    let hasPasswordHashing = false;
    let hasJWTSigning = false;
    let has2FA = false;

    authFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('bcrypt') || content.includes('argon2') || content.includes('scrypt')) {
          hasPasswordHashing = true;
        }
        
        if (content.includes('jwt.sign') && content.includes('secret')) {
          hasJWTSigning = true;
        }
        
        if (content.includes('2fa') || content.includes('totp') || content.includes('authenticator')) {
          has2FA = true;
        }
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (hasPasswordHashing) {
      this.addInfo('パスワードハッシュ化が実装されています');
      this.addScore(15);
    } else {
      this.addVulnerability('critical', 'パスワードハッシュ化が実装されていません');
    }

    if (hasJWTSigning) {
      this.addInfo('JWT署名が実装されています');
      this.addScore(10);
    } else {
      this.addWarning('JWT署名の実装が確認できませんでした');
    }

    if (has2FA) {
      this.addInfo('2要素認証が実装されています');
      this.addScore(15);
    } else {
      this.addWarning('2要素認証が実装されていません');
    }
  }

  /**
   * 設定セキュリティチェック
   */
  async checkConfigurationSecurity() {
    console.log('⚙️ 設定セキュリティをチェック中...');
    
    const configFiles = [
      '.env',
      '.env.example',
      'config/database.js',
      'config/auth.js'
    ];

    configFiles.forEach(configFile => {
      const fullPath = path.join(this.rootDir, configFile);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 本番環境での危険な設定をチェック
          if (content.includes('NODE_ENV=development') || 
              content.includes('DEBUG=true') ||
              content.includes('DISABLE_SSL=true')) {
            this.addWarning(`本番環境で危険な設定が含まれている可能性: ${configFile}`);
          }
          
          // デフォルトの認証情報をチェック
          if (content.includes('admin:admin') ||
              content.includes('root:root') ||
              content.includes('password123')) {
            this.addVulnerability('high', `デフォルトの認証情報が使用されています: ${configFile}`);
          }
        } catch (error) {
          // ファイル読み込みエラーは無視
        }
      }
    });

    this.addScore(5);
  }

  /**
   * Dockerセキュリティチェック
   */
  async checkDockerSecurity() {
    console.log('🐳 Dockerセキュリティをチェック中...');
    
    const dockerFile = path.join(this.rootDir, 'Dockerfile.backend');
    if (fs.existsSync(dockerFile)) {
      try {
        const content = fs.readFileSync(dockerFile, 'utf8');
        
        if (content.includes('USER ') && !content.includes('USER root')) {
          this.addInfo('Dockerで非rootユーザーが使用されています');
          this.addScore(10);
        } else {
          this.addWarning('Dockerでrootユーザーが使用されている可能性があります');
        }
        
        if (content.includes('COPY --chown=')) {
          this.addInfo('Dockerでファイル所有権が適切に設定されています');
          this.addScore(5);
        }
      } catch (error) {
        this.addWarning('Dockerfileの解析に失敗しました');
      }
    }
  }

  /**
   * HTTPS セキュリティチェック
   */
  async checkHTTPSSecurity() {
    console.log('🔒 HTTPSセキュリティをチェック中...');
    
    const nginxConfig = path.join(this.rootDir, 'nginx.conf');
    const appFiles = this.getJavaScriptFiles().filter(f => f.includes('app.js'));

    let hasHTTPSRedirect = false;
    let hasHSTS = false;
    let hasSecureCookies = false;

    // Nginx設定をチェック
    if (fs.existsSync(nginxConfig)) {
      try {
        const content = fs.readFileSync(nginxConfig, 'utf8');
        if (content.includes('return 301 https://')) {
          hasHTTPSRedirect = true;
        }
        if (content.includes('Strict-Transport-Security')) {
          hasHSTS = true;
        }
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    }

    // アプリケーション設定をチェック
    appFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('secure: true') || content.includes('cookie: { secure: true }')) {
          hasSecureCookies = true;
        }
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (hasHTTPSRedirect) {
      this.addInfo('HTTPSリダイレクトが設定されています');
      this.addScore(5);
    } else {
      this.addWarning('HTTPSリダイレクトが設定されていません');
    }

    if (hasHSTS) {
      this.addInfo('HSTSヘッダーが設定されています');
      this.addScore(5);
    } else {
      this.addWarning('HSTSヘッダーが設定されていません');
    }

    if (hasSecureCookies) {
      this.addInfo('セキュアCookieが設定されています');
      this.addScore(5);
    } else {
      this.addWarning('セキュアCookieが設定されていません');
    }
  }

  /**
   * 入力検証チェック
   */
  async checkInputValidation() {
    console.log('✅ 入力検証をチェック中...');
    
    const routeFiles = this.getJavaScriptFiles().filter(f => 
      f.includes('/routes/') || f.includes('/controllers/')
    );

    let hasValidation = false;
    let hasSanitization = false;

    routeFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('joi.') || content.includes('yup.') || content.includes('validator.')) {
          hasValidation = true;
        }
        
        if (content.includes('xss') || content.includes('dompurify') || content.includes('sanitize')) {
          hasSanitization = true;
        }
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (hasValidation) {
      this.addInfo('入力検証が実装されています');
      this.addScore(10);
    } else {
      this.addWarning('入力検証の実装が確認できませんでした');
    }

    if (hasSanitization) {
      this.addInfo('入力サニタイゼーションが実装されています');
      this.addScore(10);
    } else {
      this.addWarning('入力サニタイゼーションの実装が確認できませんでした');
    }
  }

  /**
   * ログセキュリティチェック
   */
  async checkLoggingSecurity() {
    console.log('📝 ログセキュリティをチェック中...');
    
    const allFiles = this.getJavaScriptFiles();
    let sensitiveDataLogged = false;

    const sensitivePatterns = [
      /console\.log\([^)]*password/i,
      /console\.log\([^)]*token/i,
      /console\.log\([^)]*secret/i,
      /logger\.[^(]*\([^)]*password/i,
      /logger\.[^(]*\([^)]*token/i
    ];

    allFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.addVulnerability('medium', `機密情報がログに出力される可能性: ${file}`);
            sensitiveDataLogged = true;
          }
        });
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    });

    if (!sensitiveDataLogged) {
      this.addInfo('機密情報のログ出力は見つかりませんでした');
      this.addScore(10);
    }
  }

  /**
   * ファイル権限チェック
   */
  async checkFilePermissions() {
    console.log('📂 ファイル権限をチェック中...');
    
    const sensitiveFiles = [
      '.env',
      'config/database.js',
      'scripts/backup.sh',
      'scripts/deploy.sh'
    ];

    let hasProperPermissions = true;

    sensitiveFiles.forEach(file => {
      const fullPath = path.join(this.rootDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          const permissions = (stats.mode & 0o777).toString(8);
          
          if (permissions === '600' || permissions === '644') {
            // 適切な権限
          } else {
            this.addWarning(`ファイル権限が適切でない可能性: ${file} (${permissions})`);
            hasProperPermissions = false;
          }
        } catch (error) {
          // 権限チェックエラーは無視
        }
      }
    });

    if (hasProperPermissions) {
      this.addScore(5);
    }
  }

  /**
   * ヘルパーメソッド
   */
  getJavaScriptFiles() {
    const files = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    
    function walkDir(dir) {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
              walkDir(fullPath);
            } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          } catch (error) {
            // ファイルアクセスエラーは無視
          }
        });
      } catch (error) {
        // ディレクトリアクセスエラーは無視
      }
    }

    walkDir(this.rootDir);
    return files;
  }

  runCommand(command, suppressError = false) {
    try {
      return execSync(command, { encoding: 'utf8', cwd: this.rootDir });
    } catch (error) {
      if (!suppressError) {
        throw error;
      }
      return null;
    }
  }

  addVulnerability(severity, message) {
    this.results.vulnerabilities.push({ severity, message });
    console.log(`❌ [${severity.toUpperCase()}] ${message}`);
  }

  addWarning(message) {
    this.results.warnings.push(message);
    console.log(`⚠️  [WARNING] ${message}`);
  }

  addInfo(message) {
    this.results.info.push(message);
    console.log(`ℹ️  [INFO] ${message}`);
  }

  addScore(points) {
    this.results.score += points;
    this.results.maxScore += points;
  }

  /**
   * レポート生成
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 セキュリティ監査レポート');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 セキュリティスコア: ${this.results.score}/${this.results.maxScore} (${Math.round(this.results.score / this.results.maxScore * 100)}%)`);
    
    console.log(`\n❌ 脆弱性: ${this.results.vulnerabilities.length}個`);
    this.results.vulnerabilities.forEach(vuln => {
      console.log(`   [${vuln.severity.toUpperCase()}] ${vuln.message}`);
    });
    
    console.log(`\n⚠️  警告: ${this.results.warnings.length}個`);
    this.results.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
    
    console.log(`\nℹ️  情報: ${this.results.info.length}個`);
    this.results.info.forEach(info => {
      console.log(`   ${info}`);
    });

    // JSON形式でレポートを保存
    const reportData = {
      timestamp: new Date().toISOString(),
      score: this.results.score,
      maxScore: this.results.maxScore,
      percentage: Math.round(this.results.score / this.results.maxScore * 100),
      vulnerabilities: this.results.vulnerabilities,
      warnings: this.results.warnings,
      info: this.results.info
    };

    fs.writeFileSync(
      path.join(__dirname, 'security-audit-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n📄 詳細レポートが security-audit-report.json に保存されました');
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().catch(console.error);
}

module.exports = SecurityAuditor;