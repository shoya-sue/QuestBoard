#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔧 開発環境用の設定を生成中...\n');

// 開発用のダミーGoogle Client IDを生成
const devGoogleClientId = '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';

// セキュアなJWT Secretを生成
const jwtSecret = crypto.randomBytes(64).toString('hex');

// バックエンドの.envを更新
const backendEnvPath = path.join(__dirname, 'backend', '.env');
let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

// JWT Secretを更新
backendEnv = backendEnv.replace(
  'JWT_SECRET=your-secret-key-change-this-in-production',
  `JWT_SECRET=${jwtSecret}`
);

// Google Client IDを更新
backendEnv = backendEnv.replace(
  'GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID',
  `GOOGLE_CLIENT_ID=${devGoogleClientId}`
);

// 管理者メールを更新（開発用）
backendEnv = backendEnv.replace(
  'ADMIN_EMAILS=admin@example.com',
  'ADMIN_EMAILS=admin@questboard.local,dev@questboard.local'
);

fs.writeFileSync(backendEnvPath, backendEnv);
console.log('✅ バックエンドの.envを更新しました');

// フロントエンドの.envを更新
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
let frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');

frontendEnv = frontendEnv.replace(
  'REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID',
  `REACT_APP_GOOGLE_CLIENT_ID=${devGoogleClientId}`
);

fs.writeFileSync(frontendEnvPath, frontendEnv);
console.log('✅ フロントエンドの.envを更新しました');

// 開発用認証モックを作成
const devAuthMock = `// 開発環境用の認証モック
const DEV_MODE = process.env.NODE_ENV === 'development' && 
                 process.env.GOOGLE_CLIENT_ID?.includes('123456789012');

const devGoogleAuth = async (credential) => {
  if (!DEV_MODE) {
    throw new Error('Dev auth only available in development mode');
  }
  
  // 開発用のダミーユーザー
  const devUser = {
    id: 'dev-user-' + Date.now(),
    email: 'dev@questboard.local',
    username: '開発ユーザー',
    googleId: 'dev-google-' + Date.now(),
    role: credential === 'admin-token' ? 'admin' : 'user'
  };
  
  return {
    user: devUser,
    token: 'dev-jwt-token-' + Date.now()
  };
};

module.exports = { DEV_MODE, devGoogleAuth };
`;

fs.writeFileSync(path.join(__dirname, 'backend', 'src', 'utils', 'devAuth.js'), devAuthMock);
console.log('✅ 開発用認証モックを作成しました');

// Google OAuth設定の説明を生成
const googleOAuthGuide = `# Google OAuth 設定ガイド

## 開発環境用設定

現在、開発環境用のダミー設定が適用されています。
実際のGoogle OAuthを使用する場合は、以下の手順に従ってください。

## 本番用Google OAuth設定手順

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス

2. 新しいプロジェクトを作成または既存のプロジェクトを選択

3. 「APIとサービス」→「認証情報」に移動

4. 「認証情報を作成」→「OAuth クライアント ID」を選択

5. アプリケーションの種類で「ウェブ アプリケーション」を選択

6. 以下の設定を行う：
   - 名前: Quest Board (任意)
   - 承認済みの JavaScript 生成元:
     - http://localhost:3000 (開発用)
     - https://your-domain.com (本番用)
   - 承認済みのリダイレクト URI: 不要

7. 作成後、クライアントIDをコピー

8. 両方の.envファイルを更新：
   - backend/.env: GOOGLE_CLIENT_ID=<your-client-id>
   - frontend/.env: REACT_APP_GOOGLE_CLIENT_ID=<your-client-id>

## 開発環境での認証テスト

現在の設定では、開発環境で以下のテストユーザーが使用可能です：

- 一般ユーザー: ログインボタンをクリック
- 管理者ユーザー: 開発ツールのコンソールで以下を実行
  \`\`\`javascript
  // 管理者としてログイン
  window.__DEV_LOGIN_AS_ADMIN__ = true;
  \`\`\`

## トラブルシューティング

- エラー「Invalid client id」が表示される場合
  → クライアントIDが正しくコピーされているか確認

- エラー「Origin not allowed」が表示される場合
  → Google Cloud Consoleで承認済みの生成元を確認

- 本番環境でのみエラーが発生する場合
  → HTTPSが正しく設定されているか確認
`;

fs.writeFileSync(path.join(__dirname, 'docs', 'google-oauth-setup.md'), googleOAuthGuide);
console.log('✅ Google OAuth設定ガイドを作成しました');

console.log('\n' + '='.repeat(50));
console.log('\n✨ 開発環境の設定が完了しました！\n');
console.log('📋 生成された設定:');
console.log(`   - JWT Secret: ${jwtSecret.substring(0, 20)}...`);
console.log(`   - Google Client ID (開発用): ${devGoogleClientId}`);
console.log('\n⚠️  注意: この設定は開発環境専用です。');
console.log('   本番環境では実際のGoogle OAuthクライアントIDを使用してください。');
console.log('\n📚 詳細な設定手順: docs/google-oauth-setup.md');