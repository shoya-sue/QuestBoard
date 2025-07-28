---
title: ローカル開発環境セットアップガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [getting-started, development, setup]
---

# ローカル開発環境セットアップガイド

## 前提条件

以下のソフトウェアがインストールされている必要があります：

- Node.js (v16以上)
- PostgreSQL (v12以上)
- Redis (オプション)
- Elasticsearch (オプション)

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd QuestBoard
```

### 2. 依存関係のインストール

```bash
# バックエンドの依存関係
cd backend
npm install

# フロントエンドの依存関係
cd ../frontend
npm install
```

### 3. PostgreSQLのセットアップ

PostgreSQLをインストールして起動し、データベースを作成します：

```sql
CREATE DATABASE questboard;
CREATE USER questboard_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE questboard TO questboard_user;
```

### 4. 環境変数の設定

#### バックエンド設定 (backend/.env)

```env
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3001
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
ADMIN_EMAILS=your-email@example.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=questboard_user
DB_PASSWORD=your_password
DB_NAME=questboard

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch Configuration (Optional)
ELASTICSEARCH_NODE=http://localhost:9200

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@questboard.com

# Sentry Configuration (Optional)
SENTRY_DSN=your-sentry-dsn
```

#### フロントエンド設定 (frontend/.env)

```env
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_SENTRY_DSN=your-sentry-dsn
```

### 5. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. OAuth 2.0クライアントIDを作成
4. 承認済みのJavaScript生成元に`http://localhost:3000`を追加
5. クライアントIDを両方の`.env`ファイルに設定

### 6. データベースマイグレーション

```bash
cd backend
npm run migrate
```

### 7. アプリケーションの起動

#### 開発モード

```bash
# バックエンドサーバー（ターミナル1）
cd backend
npm run dev

# フロントエンドサーバー（ターミナル2）
cd frontend
npm start
```

アプリケーションは以下のURLでアクセスできます：
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001

## オプションサービスの設定

### Redis（キャッシング）

```bash
# Dockerを使用する場合
docker run -d -p 6379:6379 redis

# または直接インストール
# Mac: brew install redis
# Linux: sudo apt-get install redis-server
```

### Elasticsearch（検索機能）

```bash
# Dockerを使用する場合
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# データの再インデックス
cd backend
npm run reindex
```

### メール送信（Gmail）

1. Googleアカウントで2段階認証を有効化
2. アプリパスワードを生成
3. `.env`ファイルに設定

## トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLサービスの確認
sudo service postgresql status

# 接続テスト
psql -U questboard_user -d questboard -h localhost
```

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :3000  # フロントエンド
lsof -i :3001  # バックエンド
```

### TypeScriptエラー

```bash
# フロントエンドのビルド確認
cd frontend
npm run build
```

## 開発ツール

### 推奨VSCode拡張機能

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest
- GitLens

### デバッグ

`.vscode/launch.json`を作成：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/backend/src/app.js",
      "envFile": "${workspaceFolder}/backend/.env"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

## テスト実行

```bash
# バックエンドテスト
cd backend
npm test

# フロントエンドテスト
cd frontend
npm test
```

## 本番環境へのデプロイ準備

1. 環境変数の本番値を設定
2. `npm run build`でフロントエンドをビルド
3. データベースマイグレーションを実行
4. SSL証明書を設定
5. プロセスマネージャー（PM2など）を使用