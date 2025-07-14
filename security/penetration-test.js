#!/usr/bin/env node

/**
 * ペネトレーションテストスクリプト
 * 自動化されたセキュリティテストを実行
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class PenetrationTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      tests: [],
      vulnerabilities: [],
      summary: {}
    };
    this.userAgent = 'QuestBoard-Security-Scanner/1.0';
  }

  /**
   * ペネトレーションテストの実行
   */
  async runTests() {
    console.log('🎯 ペネトレーションテストを開始...\n');
    console.log(`対象URL: ${this.baseUrl}\n`);

    await this.testSQLInjection();
    await this.testXSSVulnerabilities();
    await this.testCSRFVulnerabilities();
    await this.testAuthenticationBypass();
    await this.testDirectoryTraversal();
    await this.testHTTPHeaderSecurity();
    await this.testRateLimiting();
    await this.testSessionSecurity();
    await this.testFileUploadSecurity();
    await this.testAPIEndpointSecurity();

    this.generateReport();
  }

  /**
   * SQLインジェクションテスト
   */
  async testSQLInjection() {
    console.log('💉 SQLインジェクションテストを実行中...');

    const sqlPayloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "'; DROP TABLE users; --",
      "' UNION SELECT NULL, username, password FROM users --",
      "1' AND SLEEP(5) --",
      "1' OR BENCHMARK(10000000,MD5(1)) --"
    ];

    const endpoints = [
      '/api/users/login',
      '/api/users/search',
      '/api/quests/search',
      '/api/users/profile'
    ];

    for (const endpoint of endpoints) {
      for (const payload of sqlPayloads) {
        try {
          const testData = {
            username: payload,
            password: payload,
            search: payload,
            id: payload
          };

          const result = await this.makeRequest('POST', endpoint, testData);
          
          if (this.isSQLInjectionVulnerable(result)) {
            this.addVulnerability('high', 'SQLインジェクション', endpoint, {
              payload,
              response: result.body?.substring(0, 200)
            });
          }
        } catch (error) {
          // エラーレスポンスも脆弱性の兆候
          if (error.message.includes('SQL') || error.message.includes('database')) {
            this.addVulnerability('medium', 'SQLエラー情報漏洩', endpoint, {
              payload,
              error: error.message
            });
          }
        }
      }
    }

    this.addTestResult('SQLインジェクション', sqlPayloads.length * endpoints.length);
  }

  /**
   * XSSテスト
   */
  async testXSSVulnerabilities() {
    console.log('🕷️ XSS脆弱性テストを実行中...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '"onmouseover="alert(\'XSS\')"',
      '"><script>alert("XSS")</script>'
    ];

    const endpoints = [
      '/api/users/search',
      '/api/quests/create',
      '/api/quests/search',
      '/api/notifications/create'
    ];

    for (const endpoint of endpoints) {
      for (const payload of xssPayloads) {
        try {
          const testData = {
            content: payload,
            title: payload,
            description: payload,
            search: payload,
            name: payload
          };

          const result = await this.makeRequest('POST', endpoint, testData);
          
          if (this.isXSSVulnerable(result, payload)) {
            this.addVulnerability('medium', 'XSS脆弱性', endpoint, {
              payload,
              response: result.body?.substring(0, 200)
            });
          }
        } catch (error) {
          // XSSテストでのエラーは通常問題なし
        }
      }
    }

    this.addTestResult('XSS脆弱性', xssPayloads.length * endpoints.length);
  }

  /**
   * CSRF脆弱性テスト
   */
  async testCSRFVulnerabilities() {
    console.log('🛡️ CSRF脆弱性テストを実行中...');

    const sensitiveEndpoints = [
      { method: 'POST', path: '/api/users/delete' },
      { method: 'PUT', path: '/api/users/profile' },
      { method: 'POST', path: '/api/quests/create' },
      { method: 'DELETE', path: '/api/quests/1' },
      { method: 'POST', path: '/api/users/change-password' }
    ];

    for (const endpoint of sensitiveEndpoints) {
      try {
        // CSRFトークンなしでリクエスト
        const result = await this.makeRequest(endpoint.method, endpoint.path, {
          title: 'Test Quest',
          description: 'Test Description'
        }, {}, false); // CSRFトークンなし

        if (result.statusCode < 400) {
          this.addVulnerability('high', 'CSRF脆弱性', endpoint.path, {
            method: endpoint.method,
            message: 'CSRFトークンなしでリクエストが成功'
          });
        }
      } catch (error) {
        // CSRFエラーは期待される動作
      }
    }

    this.addTestResult('CSRF脆弱性', sensitiveEndpoints.length);
  }

  /**
   * 認証バイパステスト
   */
  async testAuthenticationBypass() {
    console.log('🔑 認証バイパステストを実行中...');

    const protectedEndpoints = [
      '/api/users/profile',
      '/api/quests/create',
      '/api/admin/users',
      '/api/users/delete'
    ];

    const bypassPayloads = [
      { headers: { 'X-Forwarded-For': '127.0.0.1' } },
      { headers: { 'X-Real-IP': '127.0.0.1' } },
      { headers: { 'X-Originating-IP': '127.0.0.1' } },
      { headers: { 'User-Agent': 'GoogleBot/2.1' } },
      { headers: { 'Authorization': 'Bearer null' } },
      { headers: { 'Authorization': 'Bearer undefined' } },
      { headers: { 'Authorization': 'Bearer admin' } }
    ];

    for (const endpoint of protectedEndpoints) {
      // 認証なしでのアクセス
      try {
        const result = await this.makeRequest('GET', endpoint);
        if (result.statusCode < 400) {
          this.addVulnerability('critical', '認証バイパス', endpoint, {
            message: '認証なしでアクセス可能'
          });
        }
      } catch (error) {
        // 認証エラーは期待される動作
      }

      // バイパス試行
      for (const payload of bypassPayloads) {
        try {
          const result = await this.makeRequest('GET', endpoint, null, payload.headers);
          if (result.statusCode < 400) {
            this.addVulnerability('high', '認証バイパス', endpoint, {
              headers: payload.headers,
              message: 'ヘッダー操作でバイパス可能'
            });
          }
        } catch (error) {
          // バイパス失敗は期待される動作
        }
      }
    }

    this.addTestResult('認証バイパス', protectedEndpoints.length * (1 + bypassPayloads.length));
  }

  /**
   * ディレクトリトラバーサルテスト
   */
  async testDirectoryTraversal() {
    console.log('📂 ディレクトリトラバーサルテストを実行中...');

    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc//passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ];

    const fileEndpoints = [
      '/api/files/',
      '/api/uploads/',
      '/downloads/',
      '/static/'
    ];

    for (const endpoint of fileEndpoints) {
      for (const payload of traversalPayloads) {
        try {
          const result = await this.makeRequest('GET', endpoint + payload);
          
          if (this.isDirectoryTraversalVulnerable(result)) {
            this.addVulnerability('high', 'ディレクトリトラバーサル', endpoint, {
              payload,
              response: result.body?.substring(0, 100)
            });
          }
        } catch (error) {
          // ファイルアクセスエラーは通常問題なし
        }
      }
    }

    this.addTestResult('ディレクトリトラバーサル', traversalPayloads.length * fileEndpoints.length);
  }

  /**
   * HTTPヘッダーセキュリティテスト
   */
  async testHTTPHeaderSecurity() {
    console.log('🔒 HTTPヘッダーセキュリティテストを実行中...');

    try {
      const result = await this.makeRequest('GET', '/');
      const headers = result.headers || {};

      const securityHeaders = {
        'strict-transport-security': 'HSTS',
        'content-security-policy': 'CSP',
        'x-frame-options': 'Clickjacking Protection',
        'x-content-type-options': 'MIME Type Sniffing Protection',
        'x-xss-protection': 'XSS Protection',
        'referrer-policy': 'Referrer Policy'
      };

      Object.entries(securityHeaders).forEach(([header, name]) => {
        if (!headers[header]) {
          this.addVulnerability('low', `欠落セキュリティヘッダー: ${name}`, '/', {
            header,
            message: `${header} ヘッダーが設定されていません`
          });
        }
      });

      // 危険なヘッダーをチェック
      if (headers['server']) {
        this.addVulnerability('info', 'サーバー情報漏洩', '/', {
          header: 'Server',
          value: headers['server']
        });
      }

      if (headers['x-powered-by']) {
        this.addVulnerability('info', 'テクノロジー情報漏洩', '/', {
          header: 'X-Powered-By',
          value: headers['x-powered-by']
        });
      }
    } catch (error) {
      console.log('ヘッダーセキュリティテストでエラー:', error.message);
    }

    this.addTestResult('HTTPヘッダーセキュリティ', 1);
  }

  /**
   * レート制限テスト
   */
  async testRateLimiting() {
    console.log('⏰ レート制限テストを実行中...');

    const endpoints = [
      '/api/users/login',
      '/api/users/register',
      '/api/auth/forgot-password'
    ];

    for (const endpoint of endpoints) {
      const requests = [];
      
      // 短期間で大量のリクエストを送信
      for (let i = 0; i < 20; i++) {
        requests.push(this.makeRequest('POST', endpoint, {
          username: `test${i}@example.com`,
          password: 'password123'
        }));
      }

      try {
        const results = await Promise.allSettled(requests);
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value.statusCode < 400
        ).length;

        if (successCount > 10) {
          this.addVulnerability('medium', 'レート制限不備', endpoint, {
            successfulRequests: successCount,
            totalRequests: 20,
            message: 'レート制限が適切に設定されていません'
          });
        }
      } catch (error) {
        console.log(`レート制限テストでエラー (${endpoint}):`, error.message);
      }
    }

    this.addTestResult('レート制限', endpoints.length);
  }

  /**
   * セッションセキュリティテスト
   */
  async testSessionSecurity() {
    console.log('🍪 セッションセキュリティテストを実行中...');

    try {
      // ログインしてセッションを取得
      const loginResult = await this.makeRequest('POST', '/api/users/login', {
        email: 'test@example.com',
        password: 'testpassword'
      });

      if (loginResult.headers && loginResult.headers['set-cookie']) {
        const cookies = loginResult.headers['set-cookie'];
        
        cookies.forEach(cookie => {
          const cookieString = cookie.toString();
          
          if (!cookieString.includes('Secure')) {
            this.addVulnerability('medium', 'セキュアCookie設定不備', '/api/users/login', {
              cookie: cookieString.split(';')[0],
              message: 'Secureフラグが設定されていません'
            });
          }
          
          if (!cookieString.includes('HttpOnly')) {
            this.addVulnerability('medium', 'HttpOnlyCookie設定不備', '/api/users/login', {
              cookie: cookieString.split(';')[0],
              message: 'HttpOnlyフラグが設定されていません'
            });
          }
          
          if (!cookieString.includes('SameSite')) {
            this.addVulnerability('low', 'SameSiteCookie設定不備', '/api/users/login', {
              cookie: cookieString.split(';')[0],
              message: 'SameSiteフラグが設定されていません'
            });
          }
        });
      }
    } catch (error) {
      console.log('セッションセキュリティテストでエラー:', error.message);
    }

    this.addTestResult('セッションセキュリティ', 1);
  }

  /**
   * ファイルアップロードセキュリティテスト
   */
  async testFileUploadSecurity() {
    console.log('📁 ファイルアップロードセキュリティテストを実行中...');

    const maliciousFiles = [
      { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/php' },
      { name: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>', type: 'application/jsp' },
      { name: 'test.asp', content: '<%eval request("cmd")%>', type: 'application/asp' },
      { name: 'test.js', content: 'require("child_process").exec(process.argv[2]);', type: 'application/javascript' },
      { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' }
    ];

    const uploadEndpoints = [
      '/api/uploads',
      '/api/files/upload',
      '/api/users/avatar'
    ];

    for (const endpoint of uploadEndpoints) {
      for (const file of maliciousFiles) {
        try {
          // FormDataを模擬したアップロードテスト
          const result = await this.makeRequest('POST', endpoint, {
            file: {
              name: file.name,
              content: file.content,
              type: file.type
            }
          });

          if (result.statusCode < 400) {
            this.addVulnerability('high', '危険ファイルアップロード', endpoint, {
              filename: file.name,
              type: file.type,
              message: '実行可能ファイルのアップロードが許可されています'
            });
          }
        } catch (error) {
          // アップロード拒否は期待される動作
        }
      }
    }

    this.addTestResult('ファイルアップロードセキュリティ', maliciousFiles.length * uploadEndpoints.length);
  }

  /**
   * APIエンドポイントセキュリティテスト
   */
  async testAPIEndpointSecurity() {
    console.log('🔗 APIエンドポイントセキュリティテストを実行中...');

    // 一般的なAPIエンドポイントをテスト
    const commonEndpoints = [
      '/api',
      '/api/docs',
      '/api/swagger',
      '/api/health',
      '/api/status',
      '/api/version',
      '/api/admin',
      '/api/debug',
      '/api/test'
    ];

    for (const endpoint of commonEndpoints) {
      try {
        const result = await this.makeRequest('GET', endpoint);
        
        if (result.statusCode < 400) {
          const body = result.body || '';
          
          // 機密情報の漏洩をチェック
          if (body.includes('password') || body.includes('secret') || body.includes('key')) {
            this.addVulnerability('medium', 'API機密情報漏洩', endpoint, {
              message: 'APIレスポンスに機密情報が含まれている可能性があります'
            });
          }
          
          // デバッグ情報の漏洩をチェック
          if (body.includes('stack trace') || body.includes('error') || body.includes('debug')) {
            this.addVulnerability('low', 'APIデバッグ情報漏洩', endpoint, {
              message: 'APIレスポンスにデバッグ情報が含まれています'
            });
          }
        }
      } catch (error) {
        // APIエンドポイントアクセスエラーは通常問題なし
      }
    }

    this.addTestResult('APIエンドポイントセキュリティ', commonEndpoints.length);
  }

  /**
   * ヘルパーメソッド
   */
  async makeRequest(method, path, data = null, headers = {}, includeAuth = true) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHTTPS = url.protocol === 'https:';
      const client = isHTTPS ? https : http;
      
      const requestHeaders = {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/json',
        ...headers
      };

      if (includeAuth && this.authToken) {
        requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
      }

      let postData = '';
      if (data && method !== 'GET') {
        postData = JSON.stringify(data);
        requestHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (isHTTPS ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: requestHeaders,
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  isSQLInjectionVulnerable(result) {
    const body = result.body || '';
    const sqlErrorPatterns = [
      /SQL syntax/i,
      /mysql_fetch/i,
      /ORA-\d+/i,
      /Microsoft.*ODBC.*SQL/i,
      /PostgreSQL.*ERROR/i,
      /Warning.*\Wmysql_/i,
      /valid MySQL result/i,
      /MySqlClient\./i
    ];

    return sqlErrorPatterns.some(pattern => pattern.test(body)) ||
           result.statusCode === 500 && body.includes('database');
  }

  isXSSVulnerable(result, payload) {
    const body = result.body || '';
    return body.includes(payload) && 
           !body.includes('&lt;') && 
           !body.includes('&gt;');
  }

  isDirectoryTraversalVulnerable(result) {
    const body = result.body || '';
    return body.includes('root:') || 
           body.includes('[boot loader]') ||
           body.includes('/etc/passwd') ||
           result.statusCode === 200 && body.length > 0;
  }

  addVulnerability(severity, type, endpoint, details) {
    this.results.vulnerabilities.push({
      severity,
      type,
      endpoint,
      details,
      timestamp: new Date().toISOString()
    });
    
    console.log(`❌ [${severity.toUpperCase()}] ${type}: ${endpoint}`);
    if (details.message) {
      console.log(`   ${details.message}`);
    }
  }

  addTestResult(testName, testCount) {
    this.results.tests.push({
      name: testName,
      count: testCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * レポート生成
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ペネトレーションテストレポート');
    console.log('='.repeat(60));
    
    const totalTests = this.results.tests.reduce((sum, test) => sum + test.count, 0);
    const totalVulns = this.results.vulnerabilities.length;
    
    console.log(`\n📊 統計:`);
    console.log(`   実行テスト数: ${totalTests}`);
    console.log(`   発見された脆弱性: ${totalVulns}`);
    
    // 重要度別の脆弱性数
    const severityCounts = this.results.vulnerabilities.reduce((counts, vuln) => {
      counts[vuln.severity] = (counts[vuln.severity] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`\n🚨 重要度別脆弱性:`);
    Object.entries(severityCounts).forEach(([severity, count]) => {
      console.log(`   ${severity.toUpperCase()}: ${count}個`);
    });
    
    console.log(`\n❌ 発見された脆弱性:`);
    this.results.vulnerabilities.forEach((vuln, index) => {
      console.log(`   ${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.type}`);
      console.log(`      エンドポイント: ${vuln.endpoint}`);
      if (vuln.details.message) {
        console.log(`      詳細: ${vuln.details.message}`);
      }
    });

    // JSON形式でレポートを保存
    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        totalTests,
        totalVulnerabilities: totalVulns,
        severityCounts
      },
      tests: this.results.tests,
      vulnerabilities: this.results.vulnerabilities
    };

    fs.writeFileSync(
      path.join(__dirname, 'penetration-test-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n📄 詳細レポートが penetration-test-report.json に保存されました');
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new PenetrationTester(baseUrl);
  tester.runTests().catch(console.error);
}

module.exports = PenetrationTester;