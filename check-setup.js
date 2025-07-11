#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Quest Board セットアップチェック\n');

let hasErrors = false;
let hasWarnings = false;

// バックエンド環境変数チェック
console.log('📁 バックエンド設定をチェック中...');
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
  
  // 必須設定
  if (!backendEnv.includes('DB_HOST=') || backendEnv.includes('DB_HOST=\n')) {
    console.error('❌ データベース設定が見つかりません (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
    hasErrors = true;
  } else {
    console.log('✅ データベース設定が見つかりました');
  }
  
  if (backendEnv.includes('GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID')) {
    console.warn('⚠️  Google OAuth設定が必要です (GOOGLE_CLIENT_ID)');
    hasWarnings = true;
  } else {
    console.log('✅ Google OAuth設定が見つかりました');
  }
  
  if (backendEnv.includes('JWT_SECRET=your-secret-key-change-this-in-production')) {
    console.warn('⚠️  JWT秘密鍵をデフォルトから変更してください');
    hasWarnings = true;
  }
} else {
  console.error('❌ backend/.env ファイルが見つかりません');
  console.log('   backend/.env.example をコピーして設定してください');
  hasErrors = true;
}

console.log('');

// フロントエンド環境変数チェック
console.log('📁 フロントエンド設定をチェック中...');
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(frontendEnvPath)) {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
  
  if (frontendEnv.includes('REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID')) {
    console.warn('⚠️  Google OAuth設定が必要です (REACT_APP_GOOGLE_CLIENT_ID)');
    hasWarnings = true;
  } else {
    console.log('✅ Google OAuth設定が見つかりました');
  }
  
  if (!frontendEnv.includes('REACT_APP_API_URL=')) {
    console.error('❌ API URLの設定が見つかりません');
    hasErrors = true;
  } else {
    console.log('✅ API URL設定が見つかりました');
  }
} else {
  console.error('❌ frontend/.env ファイルが見つかりません');
  console.log('   frontend/.env.example をコピーして設定してください');
  hasErrors = true;
}

console.log('');

// 依存関係チェック
console.log('📦 依存関係をチェック中...');
const backendPackageLock = path.join(__dirname, 'backend', 'package-lock.json');
const frontendPackageLock = path.join(__dirname, 'frontend', 'package-lock.json');

if (!fs.existsSync(backendPackageLock)) {
  console.error('❌ バックエンドの依存関係がインストールされていません');
  console.log('   cd backend && npm install を実行してください');
  hasErrors = true;
} else {
  console.log('✅ バックエンドの依存関係がインストールされています');
}

if (!fs.existsSync(frontendPackageLock)) {
  console.error('❌ フロントエンドの依存関係がインストールされていません');
  console.log('   cd frontend && npm install を実行してください');
  hasErrors = true;
} else {
  console.log('✅ フロントエンドの依存関係がインストールされています');
}

console.log('\n' + '='.repeat(50) + '\n');

// 結果サマリー
if (hasErrors) {
  console.error('❌ セットアップに問題があります。上記のエラーを修正してください。');
  console.log('\n詳細な手順は docs/setup-local.md を参照してください。');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  セットアップは可能ですが、いくつかの推奨設定があります。');
  console.log('\n✅ 基本的なセットアップは完了しています！');
  console.log('\n次のコマンドでアプリケーションを起動できます:');
  console.log('  バックエンド: cd backend && npm run dev');
  console.log('  フロントエンド: cd frontend && npm start');
} else {
  console.log('✅ セットアップは完璧です！');
  console.log('\n次のコマンドでアプリケーションを起動できます:');
  console.log('  バックエンド: cd backend && npm run dev');
  console.log('  フロントエンド: cd frontend && npm start');
}

console.log('\n📚 ドキュメント:');
console.log('  - セットアップガイド: docs/setup-local.md');
console.log('  - 検索機能: docs/search-setup.md');
console.log('  - 通知機能: docs/notification-setup.md');