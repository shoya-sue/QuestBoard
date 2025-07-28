---
title: 最小構成デプロイガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, deployment, minimal, conoha, production]
description: Redis/Elasticsearchなしの最小構成でQuest Boardをデプロイする方法
keywords: [minimal, deployment, without-redis, without-elasticsearch]
---

# 🚀 最小構成デプロイガイド

リソースを節約してQuest Boardを動作させるための最小構成ガイドです。

## 📋 最小構成の内容

### 含まれるもの ✅
- Node.js バックエンド
- React フロントエンド
- PostgreSQL 15
- Apache Webサーバー
- SSL証明書（Let's Encrypt）
- PM2プロセス管理

### 含まれないもの ❌
- Redis（メモリキャッシュで代替）
- Elasticsearch（基本検索機能で代替）
- メール送信（ログに記録）
- 高度な監視機能

## 🎯 必要なVPSスペック

### 最小要件
- **CPU**: 1コア
- **メモリ**: 2GB RAM
- **ストレージ**: 20GB SSD
- **OS**: AlmaLinux 9

### 推奨要件
- **CPU**: 2コア
- **メモリ**: 4GB RAM
- **ストレージ**: 40GB SSD

## 🔧 環境変数の設定

### 最小構成用 .env

```bash
cd /var/www/questboard/backend
cp .env.example .env
nano .env
```

```bash
# === 基本設定 ===
NODE_ENV=production
PORT=3001

# === データベース設定 ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=questboard_prod
DB_USER=questboard_user
DB_PASSWORD=your_secure_password_here

# === セキュリティ設定 ===
JWT_SECRET=your_jwt_secret_here_64_characters_minimum
SESSION_SECRET=your_session_secret_here_32_characters

# === ドメイン設定 ===
FRONTEND_URL=https://quest.sho43.xyz
API_URL=https://api.quest.sho43.xyz

# === Google OAuth設定 ===
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# === 管理者設定 ===
ADMIN_EMAILS=admin@example.com

# === オプションサービス（無効化） ===
# Redisを使用しない（メモリキャッシュを使用）
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Elasticsearchを使用しない（基本検索を使用）
ELASTICSEARCH_NODE=
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# メール送信を無効化（ログに記録）
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=

# Sentryを無効化
SENTRY_DSN=
```

## 📝 アプリケーションの調整

### 1. キャッシュサービスの置き換え

```bash
# オプショナルキャッシュサービスを使用
cd /var/www/questboard/backend/src/services
mv cache.js cache.js.bak
cp ../config/cache-optional.js cache.js
```

### 2. PM2設定の最適化

```javascript
// ecosystem.config.js（最小構成用）
module.exports = {
  apps: [{
    name: 'questboard-api',
    script: './backend/dist/app.js',
    cwd: '/var/www/questboard',
    instances: 1,  // 最小構成では1インスタンス
    exec_mode: 'fork',  // クラスターモードではなくforkモード
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/questboard/api-error.log',
    out_file: '/var/log/questboard/api-out.log',
    log_file: '/var/log/questboard/api-combined.log',
    time: true,
    max_memory_restart: '500M',  // メモリ制限を低く設定
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

## 🔄 サービスの無効化確認

### Redisが不要であることの確認

```bash
# アプリケーションログを確認
pm2 logs questboard-api

# 以下のようなメッセージが表示されればOK
# [INFO] Redis not configured, using memory cache
```

### Elasticsearchが不要であることの確認

```bash
# 検索APIのテスト
curl https://api.quest.sho43.xyz/api/search/quests?q=test

# 基本的な検索が動作することを確認
```

## 🎯 パフォーマンスチューニング

### 1. Node.jsメモリ設定

```bash
# PM2でメモリ使用量を制限
pm2 set questboard-api --max-memory-restart 500M
```

### 2. PostgreSQL最適化

```bash
sudo nano /var/lib/pgsql/15/data/postgresql.conf
```

```conf
# 最小構成用の設定
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB
max_connections = 50
```

### 3. Apache最適化

```bash
sudo nano /etc/httpd/conf/httpd.conf
```

```apache
# 最小構成用の設定
<IfModule mpm_prefork_module>
    StartServers          2
    MinSpareServers       2
    MaxSpareServers       5
    MaxRequestWorkers     50
    MaxConnectionsPerChild 1000
</IfModule>
```

## 📊 リソース使用量の目安

### メモリ使用量
- **OS + 基本サービス**: ~500MB
- **PostgreSQL**: ~300MB
- **Node.js (PM2)**: ~200MB
- **Apache**: ~100MB
- **余裕**: ~900MB
- **合計**: 2GB

### CPU使用率
- **アイドル時**: 5-10%
- **通常使用時**: 20-30%
- **ピーク時**: 50-70%

## 🚨 制限事項と対処法

### 1. キャッシュの制限
- **制限**: メモリキャッシュは再起動で消える
- **対処**: 重要なデータはデータベースに保存

### 2. 検索機能の制限
- **制限**: 全文検索の性能が劣る
- **対処**: PostgreSQLの全文検索を活用

```sql
-- PostgreSQLで全文検索インデックスを作成
CREATE INDEX idx_quests_title_gin ON quests USING gin(to_tsvector('japanese', title));
CREATE INDEX idx_quests_description_gin ON quests USING gin(to_tsvector('japanese', description));
```

### 3. スケーリングの制限
- **制限**: 単一サーバーでの処理能力
- **対処**: 必要に応じてVPSアップグレード

## 📈 将来的なアップグレードパス

### Step 1: メモリ増設（4GB）
```bash
# Redisを追加
sudo dnf install -y redis
sudo systemctl enable redis
sudo systemctl start redis

# .envでRedis有効化
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 2: 検索機能強化（6GB）
```bash
# Elasticsearchを追加
# （要Java環境）
```

### Step 3: 完全構成（8GB）
- Redis Cluster
- Elasticsearch Cluster
- 複数PM2インスタンス

## 🎯 動作確認

### 最小構成での動作確認

```bash
# システムリソース確認
free -h
top

# アプリケーション動作確認
curl https://api.quest.sho43.xyz/api/health
# 期待される応答: {"status":"ok","cache":"memory","search":"basic"}

# ログ確認
pm2 logs questboard-api --lines 100
```

## 📝 メンテナンス

### 定期的なメンテナンス

```bash
# 週次: ログローテーション
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 月次: データベースVACUUM
sudo -u postgres psql questboard_prod -c "VACUUM ANALYZE;"

# 月次: メモリキャッシュのクリア（必要に応じて）
pm2 restart questboard-api
```

## 🎉 まとめ

この最小構成により：
- **2GB RAMのVPS**で快適に動作
- **月額1,000円以下**での運用が可能
- **基本機能は全て利用可能**
- **将来的な拡張も容易**

必要に応じてRedisやElasticsearchを後から追加できる柔軟な構成です。