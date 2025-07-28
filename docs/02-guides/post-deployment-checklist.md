---
title: デプロイ後チェックリスト
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, deployment, checklist, post-deployment]
description: ConoHa VPSデプロイ後の確認事項と設定完了チェックリスト
keywords: [checklist, deployment, verification, post-deployment, conoha]
---

# ✅ デプロイ後チェックリスト

ConoHa VPSへのデプロイ完了後に実施する確認事項と設定です。

## 🎯 必須設定項目

### 1. DNS設定確認 🌐

```bash
# DNS設定の確認
nslookup quest.sho43.xyz
nslookup api.quest.sho43.xyz

# 応答例（あなたのVPS IPアドレスが返されること）
# quest.sho43.xyz
# Address: xxx.xxx.xxx.xxx
```

**設定場所**: ドメイン管理サービス（お名前.com等）
- **Aレコード**: `quest.sho43.xyz` → VPSのIPアドレス
- **Aレコード**: `api.quest.sho43.xyz` → VPSのIPアドレス

### 2. SSL証明書取得 🔒

```bash
# Let's Encrypt証明書取得
sudo certbot --apache -d quest.sho43.xyz -d api.quest.sho43.xyz

# 証明書確認
sudo certbot certificates

# 自動更新テスト
sudo certbot renew --dry-run
```

**成功確認**:
- 証明書が正常に取得されること
- HTTPSでアクセス可能になること

### 3. 環境変数設定完了 ⚙️

```bash
# .env ファイル編集
cd /var/www/questboard/backend
sudo nano .env
```

**必須設定項目**:
```bash
# セキュリティ
JWT_SECRET=生成した64文字以上のランダム文字列
SESSION_SECRET=生成した32文字以上のランダム文字列

# Google OAuth（Google Cloud Consoleで取得）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# データベース
DB_PASSWORD=PostgreSQLに設定したパスワード

# メール設定（SMTP）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 4. PostgreSQL設定完了 🗄️

```bash
# PostgreSQL接続テスト
sudo -u postgres psql

# データベース確認
\l
\c questboard_prod
\dt

# 権限確認
\du
```

**データベース作成（未作成の場合）**:
```sql
CREATE DATABASE questboard_prod;
CREATE USER questboard_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE questboard_prod TO questboard_user;
ALTER USER questboard_user CREATEDB;
```

### 5. Google OAuth設定 🔐

**Google Cloud Console設定**:
1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクト作成または既存プロジェクト選択
3. 「APIs & Services」→「Credentials」
4. 「OAuth 2.0 Client IDs」を作成

**承認済みのリダイレクトURI**:
```
https://api.quest.sho43.xyz/auth/google/callback
```

**承認済みのJavaScript生成元**:
```
https://quest.sho43.xyz
https://api.quest.sho43.xyz
```

## 🔍 動作確認チェック

### 1. システムサービス確認

```bash
# Apache状態確認
sudo systemctl status httpd
# ✅ Active: active (running)

# PostgreSQL状態確認
sudo systemctl status postgresql
# ✅ Active: active (running)

# PM2状態確認
pm2 status
# ✅ questboard-api │ online

# ファイアウォール確認
sudo ufw status
# ✅ Status: active
```

### 2. ネットワーク接続確認

```bash
# HTTPSアクセステスト
curl -I https://quest.sho43.xyz
# ✅ HTTP/2 200

curl -I https://api.quest.sho43.xyz
# ✅ HTTP/2 200

# API健康確認
curl https://api.quest.sho43.xyz/api/health
# ✅ {"status":"ok","timestamp":"..."}

# SSL証明書確認
openssl s_client -connect quest.sho43.xyz:443 -servername quest.sho43.xyz < /dev/null 2>/dev/null | openssl x509 -text -noout | grep "Subject:"
# ✅ Subject: CN=quest.sho43.xyz
```

### 3. アプリケーション機能確認

**フロントエンド確認**:
- [ ] https://quest.sho43.xyz にアクセス可能
- [ ] ページが正常に表示される
- [ ] Google Login ボタンが表示される
- [ ] レスポンシブデザインが動作する

**API確認**:
- [ ] https://api.quest.sho43.xyz/api/health が正常応答
- [ ] https://api.quest.sho43.xyz/api/docs でSwagger UIが表示される
- [ ] WebSocket接続が正常に動作する

**データベース確認**:
- [ ] アプリケーションからデータベース接続できる
- [ ] ユーザー登録・ログインが正常に動作する
- [ ] クエストの作成・編集・削除が正常に動作する

## 🛡️ セキュリティ確認

### 1. セキュリティヘッダー確認

```bash
# セキュリティヘッダーチェック
curl -I https://quest.sho43.xyz

# 以下のヘッダーが含まれることを確認
# ✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# ✅ X-Content-Type-Options: nosniff
# ✅ X-Frame-Options: DENY
# ✅ X-XSS-Protection: 1; mode=block
```

### 2. ファイアウォール設定確認

```bash
sudo ufw status numbered

# 以下のルールが設定されていることを確認
# ✅ [1] 22/tcp (SSH)
# ✅ [2] 80/tcp (HTTP)
# ✅ [3] 443/tcp (HTTPS)
```

### 3. fail2ban設定（オプション）

```bash
# fail2ban インストール・設定
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 状態確認
sudo fail2ban-client status
```

## 📊 パフォーマンス確認

### 1. 応答時間確認

```bash
# 応答時間測定
time curl -s https://quest.sho43.xyz > /dev/null
# ✅ 1秒以下であることを確認

time curl -s https://api.quest.sho43.xyz/api/health > /dev/null
# ✅ 0.5秒以下であることを確認
```

### 2. PM2監視設定

```bash
# PM2監視の設定
pm2 install pm2-server-monit

# ログローテーション設定
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 設定保存
pm2 save
```

### 3. システムリソース確認

```bash
# CPU・メモリ使用率確認
top
htop

# ディスク使用量確認
df -h

# メモリ使用量確認
free -h
```

## 🔄 バックアップ確認

### 1. 自動バックアップテスト

```bash
# バックアップスクリプト実行テスト
/var/backups/questboard/backup.sh

# バックアップファイル確認
ls -la /var/backups/questboard/
# ✅ db_backup_*.sql.gz
# ✅ app_backup_*.tar.gz
```

### 2. バックアップからの復元テスト

```bash
# データベースバックアップから復元テスト
gunzip -c /var/backups/questboard/db_backup_*.sql.gz | sudo -u postgres psql questboard_test

# アプリケーションバックアップから復元テスト
tar -tzf /var/backups/questboard/app_backup_*.tar.gz | head -10
```

## 📝 ログ確認

### 1. アプリケーションログ

```bash
# PM2ログ確認
pm2 logs questboard-api --lines 50

# Apache ログ確認
sudo tail -f /var/log/httpd/access_log
sudo tail -f /var/log/httpd/error_log

# Quest Board 独自ログ
tail -f /var/log/questboard/api-combined.log
```

### 2. システムログ

```bash
# システムログ確認
sudo journalctl -f

# 特定サービスログ
sudo journalctl -u httpd -f
sudo journalctl -u postgresql -f
```

## 🎭 運用手順確認

### 1. 日常運用コマンド

```bash
# アプリケーション再起動
pm2 restart questboard-api

# Apache再起動
sudo systemctl restart httpd

# PostgreSQL再起動
sudo systemctl restart postgresql

# ログ確認
pm2 logs questboard-api
pm2 monit
```

### 2. 更新デプロイ手順

```bash
# 更新デプロイスクリプト作成
cat > /var/www/questboard/update.sh << 'EOF'
#!/bin/bash
cd /var/www/questboard

echo "🔄 Quest Board 更新開始..."

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

echo "✅ 更新完了!"
curl -s https://api.quest.sho43.xyz/api/health
EOF

chmod +x /var/www/questboard/update.sh
```

## 🎯 最終チェックリスト

### システム設定
- [ ] DNS設定完了（quest.sho43.xyz, api.quest.sho43.xyz）
- [ ] SSL証明書取得・自動更新設定完了
- [ ] ファイアウォール（ufw）設定完了
- [ ] fail2ban設定完了（オプション）

### アプリケーション設定
- [ ] .env ファイル設定完了
- [ ] Google OAuth設定完了
- [ ] PostgreSQL設定完了
- [ ] PM2自動起動設定完了

### 動作確認
- [ ] フロントエンド正常表示
- [ ] API正常応答
- [ ] データベース接続確認
- [ ] WebSocket動作確認
- [ ] 認証機能動作確認

### セキュリティ
- [ ] HTTPS強制リダイレクト動作
- [ ] セキュリティヘッダー設定確認
- [ ] ファイアウォール動作確認
- [ ] SSL証明書有効期限確認

### バックアップ・監視
- [ ] 自動バックアップ動作確認
- [ ] PM2監視設定完了
- [ ] ログローテーション設定完了
- [ ] システムリソース監視設定

### 運用準備
- [ ] 更新デプロイ手順確認
- [ ] 障害対応手順書作成
- [ ] 緊急連絡先設定
- [ ] 運用監視設定完了

---

## 🎉 デプロイ完了！

すべてのチェック項目が完了したら、Quest Board が本番環境で正常に動作しています。

**アクセスURL**:
- **メインサイト**: https://quest.sho43.xyz
- **API**: https://api.quest.sho43.xyz
- **API ドキュメント**: https://api.quest.sho43.xyz/api/docs

**サポート情報**:
- トラブルシューティング: [deployment-guide.md](./conoha-deployment-guide.md)
- 運用手順: 上記の日常運用コマンドを参照
- 更新手順: `/var/www/questboard/update.sh` を実行