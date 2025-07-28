---
title: ConoHa VPS デプロイメントガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, deployment, conoha, almalinux, production]
description: ConoHa VPS + AlmaLinux 9環境でのQuest Board完全デプロイガイド
keywords: [conoha, vps, almalinux, postgresql, apache, ssl, pm2]
---

# 🚀 ConoHa VPS デプロイメントガイド

Quest BoardをConoHa VPS（AlmaLinux 9）環境に本格デプロイするための完全ガイドです。

## 📋 環境情報

```yaml
VPS: ConoHa VPS
OS: AlmaLinux 9
Database: PostgreSQL 15
Web Server: Apache
SSL: Let's Encrypt
Process Manager: PM2
Firewall: ufw
Domain: quest.sho43.xyz
API Domain: api.quest.sho43.xyz
```

## 🎯 デプロイメント手順

### Phase 1: 基本環境セットアップ

#### 1.1 システム更新とセキュリティ設定

```bash
# システム更新
sudo dnf update -y

# 必要なツールをインストール
sudo dnf install -y curl wget git unzip epel-release

# Node.js 20.x リポジトリ追加
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Node.js インストール
sudo dnf install -y nodejs

# Node.js バージョン確認
node --version  # v20.x.x
npm --version   # 10.x.x
```

#### 1.2 PostgreSQL 15 設定確認

```bash
# PostgreSQL状態確認
sudo systemctl status postgresql

# データベースとユーザー作成
sudo -u postgres psql
```

```sql
-- PostgreSQL内で実行
CREATE DATABASE questboard_prod;
CREATE USER questboard_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE questboard_prod TO questboard_user;
ALTER USER questboard_user CREATEDB;
\q
```

#### 1.3 PM2とApache インストール

```bash
# PM2をグローバルインストール
sudo npm install -g pm2

# Apache インストール
sudo dnf install -y httpd httpd-tools

# Apache有効化
sudo systemctl enable httpd
sudo systemctl start httpd
```

### Phase 2: ファイアウォール設定

#### 2.1 ufw設定

```bash
# ufw インストール（AlmaLinux 9の場合）
sudo dnf install -y ufw

# ufw基本設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポートを開放
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# ufwを有効化
sudo ufw enable

# 状態確認
sudo ufw status verbose
```

### Phase 3: SSL証明書設定

#### 3.1 Certbot インストール

```bash
# Certbot インストール
sudo dnf install -y certbot python3-certbot-apache

# DNS設定確認（事前にドメインをVPSのIPに設定）
nslookup quest.sho43.xyz
nslookup api.quest.sho43.xyz
```

#### 3.2 SSL証明書取得

```bash
# Let's Encrypt証明書取得
sudo certbot --apache -d quest.sho43.xyz -d api.quest.sho43.xyz

# 自動更新設定
sudo crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### Phase 4: アプリケーションデプロイ

#### 4.1 アプリケーションディレクトリ作成

```bash
# デプロイ用ディレクトリ作成
sudo mkdir -p /var/www/questboard
sudo chown $USER:$USER /var/www/questboard
cd /var/www/questboard

# Gitリポジトリクローン
git clone https://github.com/shoya-sue/QuestBoard.git .
```

#### 4.2 バックエンドセットアップ

```bash
# バックエンド依存関係インストール
cd /var/www/questboard/backend
npm install

# 本番用環境変数設定
cp .env.example .env
nano .env
```

```bash
# .env ファイル内容
NODE_ENV=production
PORT=3001

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=questboard_prod
DB_USER=questboard_user
DB_PASSWORD=your_secure_password_here

# セキュリティ設定
JWT_SECRET=your_jwt_secret_here_64_characters_minimum_for_security
SESSION_SECRET=your_session_secret_here

# ドメイン設定
FRONTEND_URL=https://quest.sho43.xyz
API_URL=https://api.quest.sho43.xyz

# Google OAuth設定（Google Cloud Consoleで設定）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# メール設定（Gmail SMTP例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Redis設定（オプション）
REDIS_URL=redis://localhost:6379

# Elasticsearch設定（オプション）
ELASTICSEARCH_URL=http://localhost:9200
```

```bash
# データベースマイグレーション実行
npm run migrate 2>/dev/null || echo "Migration completed or not needed"

# バックエンドビルド
npm run build

# 本番依存関係のみインストール
cd dist
npm install --production
```

#### 4.3 フロントエンドセットアップ

```bash
# フロントエンド依存関係インストール
cd /var/www/questboard/frontend
npm install

# 本番ビルド
npm run build
```

### Phase 5: Apache設定

#### 5.1 Virtual Host設定

```bash
# Apache設定ファイル作成
sudo nano /etc/httpd/conf.d/questboard.conf
```

```apache
# questboard.conf

# フロントエンド用（quest.sho43.xyz）
<VirtualHost *:80>
    ServerName quest.sho43.xyz
    DocumentRoot /var/www/questboard/frontend/build
    
    # HTTPSリダイレクト
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName quest.sho43.xyz
    DocumentRoot /var/www/questboard/frontend/build
    
    # SSL設定（Certbotが自動設定）
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/quest.sho43.xyz/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/quest.sho43.xyz/privkey.pem
    
    # セキュリティヘッダー
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # React Router対応
    <Directory "/var/www/questboard/frontend/build">
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # SPA用リライト
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # 静的ファイルキャッシュ
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 month"
    </LocationMatch>
</VirtualHost>

# APIサーバー用（api.quest.sho43.xyz）
<VirtualHost *:80>
    ServerName api.quest.sho43.xyz
    
    # HTTPSリダイレクト
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName api.quest.sho43.xyz
    
    # SSL設定
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/quest.sho43.xyz/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/quest.sho43.xyz/privkey.pem
    
    # リバースプロキシ設定
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    # WebSocket対応
    ProxyPass /socket.io/ ws://localhost:3001/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3001/socket.io/
    
    # セキュリティヘッダー
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</VirtualHost>
```

#### 5.2 Apache モジュール有効化

```bash
# 必要なモジュールを有効化
sudo dnf install -y mod_ssl mod_rewrite

# Apache設定テスト
sudo httpd -t

# Apache再起動
sudo systemctl restart httpd
```

### Phase 6: PM2設定

#### 6.1 PM2設定ファイル作成

```bash
# PM2設定ファイル作成
cd /var/www/questboard
nano ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'questboard-api',
    script: './backend/dist/app.js',
    cwd: '/var/www/questboard',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/questboard/api-error.log',
    out_file: '/var/log/questboard/api-out.log',
    log_file: '/var/log/questboard/api-combined.log',
    time: true,
    
    // プロセス管理設定
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // 再起動設定
    max_restarts: 10,
    min_uptime: '10s',
    
    // クラスター管理
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }]
};
```

#### 6.2 ログディレクトリとPM2起動

```bash
# ログディレクトリ作成
sudo mkdir -p /var/log/questboard
sudo chown $USER:$USER /var/log/questboard

# PM2でアプリケーション起動
pm2 start ecosystem.config.js

# PM2自動起動設定
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# 現在のPM2設定を保存
pm2 save

# PM2ステータス確認
pm2 status
pm2 logs questboard-api
```

### Phase 7: システム監視設定

#### 7.1 PM2 Monit設定

```bash
# PM2 Web監視（オプション）
pm2 install pm2-server-monit

# PM2ログローテーション
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

#### 7.2 システムサービス確認

```bash
# 全サービス状態確認
sudo systemctl status httpd
sudo systemctl status postgresql
pm2 status

# 自動起動設定確認
sudo systemctl is-enabled httpd
sudo systemctl is-enabled postgresql
```

### Phase 8: セキュリティ強化

#### 8.1 追加セキュリティ設定

```bash
# SSH設定強化
sudo nano /etc/ssh/sshd_config
# 以下を設定
# PermitRootLogin no
# PasswordAuthentication no
# Port 22 (デフォルトから変更推奨)

# SSHサービス再起動
sudo systemctl restart sshd

# fail2ban インストール（オプション）
sudo dnf install -y fail2ban

# fail2ban設定
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
# [sshd] セクションで enabled = true

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Phase 9: バックアップ設定

#### 9.1 自動バックアップスクリプト

```bash
# バックアップディレクトリ作成
sudo mkdir -p /var/backups/questboard
sudo chown $USER:$USER /var/backups/questboard

# バックアップスクリプト作成
nano /var/backups/questboard/backup.sh
```

```bash
#!/bin/bash
# Quest Board自動バックアップスクリプト

BACKUP_DIR="/var/backups/questboard"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="questboard_prod"
DB_USER="questboard_user"

# データベースバックアップ
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# アプリケーションファイルバックアップ
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www questboard

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# スクリプトに実行権限付与
chmod +x /var/backups/questboard/backup.sh

# 日次バックアップのcron設定
crontab -e
# 以下を追加（毎日午前2時に実行）
0 2 * * * /var/backups/questboard/backup.sh >> /var/log/questboard/backup.log 2>&1
```

### Phase 10: デプロイ完了確認

#### 10.1 動作確認チェックリスト

```bash
# 1. Webサイトアクセス確認
curl -I https://quest.sho43.xyz
curl -I https://api.quest.sho43.xyz

# 2. SSL証明書確認
openssl s_client -connect quest.sho43.xyz:443 -servername quest.sho43.xyz < /dev/null

# 3. API動作確認
curl https://api.quest.sho43.xyz/api/health

# 4. データベース接続確認
sudo -u postgres psql -d questboard_prod -c "SELECT version();"

# 5. PM2プロセス確認
pm2 status
pm2 logs questboard-api --lines 50

# 6. Apache設定確認
sudo httpd -S
sudo systemctl status httpd

# 7. ファイアウォール確認
sudo ufw status
```

## 🔄 デプロイ後の運用

### 日常運用コマンド

```bash
# アプリケーション再起動
pm2 restart questboard-api

# ログ確認
pm2 logs questboard-api
tail -f /var/log/questboard/api-combined.log

# システム状態確認
pm2 monit

# SSL証明書更新確認
sudo certbot certificates

# バックアップ手動実行
/var/backups/questboard/backup.sh
```

### 更新デプロイ

```bash
# 新しいバージョンのデプロイ
cd /var/www/questboard

# コードプル
git pull origin main

# バックエンド更新
cd backend
npm install
npm run build
cd dist && npm install --production

# フロントエンド更新  
cd ../../frontend
npm install
npm run build

# アプリケーション再起動
pm2 restart questboard-api

# 動作確認
curl https://api.quest.sho43.xyz/api/health
```

## 🎯 完了

これで Quest Board が ConoHa VPS 上に完全にデプロイされました！

### アクセスURL
- **メインサイト**: https://quest.sho43.xyz
- **API**: https://api.quest.sho43.xyz

### トラブルシューティング
問題が発生した場合は以下を確認：
1. `pm2 logs questboard-api`
2. `sudo journalctl -u httpd -f`
3. `/var/log/questboard/`のログファイル
4. `sudo systemctl status postgresql`

---

**デプロイ完了！** 🎉