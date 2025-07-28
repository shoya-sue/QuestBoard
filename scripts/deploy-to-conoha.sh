#!/bin/bash

# Quest Board ConoHa VPS自動デプロイスクリプト
# 使用方法: ./deploy-to-conoha.sh [server_ip] [username]

set -e

# 設定
SERVER_IP=${1:-"your_server_ip"}
USERNAME=${2:-"your_username"}
DOMAIN="quest.sho43.xyz"
API_DOMAIN="api.quest.sho43.xyz"
PROJECT_DIR="/var/www/questboard"

echo "🚀 Quest Board ConoHa VPS デプロイを開始..."

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 引数チェック
if [ "$SERVER_IP" = "your_server_ip" ]; then
    log_error "サーバーIPアドレスを指定してください"
    echo "使用方法: $0 [server_ip] [username]"
    exit 1
fi

# ローカルビルド実行
log_info "ローカルでビルドを実行中..."
npm run build

# サーバーに接続してデプロイ実行
log_info "サーバー ${SERVER_IP} に接続してデプロイを実行..."

ssh -o StrictHostKeyChecking=no ${USERNAME}@${SERVER_IP} << 'ENDSSH'

# エラー時は即座に終了
set -e

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

PROJECT_DIR="/var/www/questboard"
DOMAIN="quest.sho43.xyz"
API_DOMAIN="api.quest.sho43.xyz"

log_info "=== Phase 1: システム更新 ==="
sudo dnf update -y

log_info "=== Phase 2: 必要なパッケージインストール ==="
sudo dnf install -y curl wget git unzip epel-release

# Node.js 20.x インストール
if ! command -v node &> /dev/null; then
    log_info "Node.js をインストール中..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
fi

# PM2インストール
if ! command -v pm2 &> /dev/null; then
    log_info "PM2 をインストール中..."
    sudo npm install -g pm2
fi

# Apache インストール
if ! systemctl is-active --quiet httpd; then
    log_info "Apache をインストール中..."
    sudo dnf install -y httpd httpd-tools mod_ssl
    sudo systemctl enable httpd
    sudo systemctl start httpd
fi

log_info "=== Phase 3: ufw設定 ==="
if ! command -v ufw &> /dev/null; then
    sudo dnf install -y ufw
fi

sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

log_info "=== Phase 4: アプリケーションディレクトリ準備 ==="
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# 既存のプロジェクトがある場合はバックアップ
if [ -d "$PROJECT_DIR/.git" ]; then
    log_info "既存のプロジェクトをバックアップ中..."
    sudo cp -r $PROJECT_DIR ${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)
    cd $PROJECT_DIR
    git pull origin main
else
    log_info "プロジェクトをクローン中..."
    git clone https://github.com/shoya-sue/QuestBoard.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

log_info "=== Phase 5: PostgreSQL設定確認 ==="
if ! systemctl is-active --quiet postgresql; then
    log_warning "PostgreSQL が起動していません。手動で設定してください。"
else
    log_info "PostgreSQL は動作中です"
fi

log_info "=== Phase 6: バックエンドセットアップ ==="
cd $PROJECT_DIR/backend

# 依存関係インストール
npm install

# .env ファイル作成
if [ ! -f .env ]; then
    log_info ".env ファイルを作成中..."
    cp .env.example .env
    
    # 基本設定を更新
    sed -i "s|NODE_ENV=development|NODE_ENV=production|g" .env
    sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=https://$DOMAIN|g" .env
    sed -i "s|API_URL=http://localhost:3001|API_URL=https://$API_DOMAIN|g" .env
    
    log_warning ".env ファイルが作成されました。Google OAuth等の設定を手動で完了してください。"
fi

# ビルド実行
npm run build

# 本番依存関係インストール
cd dist
npm install --production

log_info "=== Phase 7: フロントエンドセットアップ ==="
cd $PROJECT_DIR/frontend
npm install
npm run build

log_info "=== Phase 8: Apache設定 ==="
sudo tee /etc/httpd/conf.d/questboard.conf > /dev/null << 'EOF'
# フロントエンド用（quest.sho43.xyz）
<VirtualHost *:80>
    ServerName quest.sho43.xyz
    DocumentRoot /var/www/questboard/frontend/build
    
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName quest.sho43.xyz
    DocumentRoot /var/www/questboard/frontend/build
    
    # SSL設定はCertbotが自動設定
    
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    
    <Directory "/var/www/questboard/frontend/build">
        Options -Indexes
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 month"
    </LocationMatch>
</VirtualHost>

# APIサーバー用（api.quest.sho43.xyz）
<VirtualHost *:80>
    ServerName api.quest.sho43.xyz
    
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName api.quest.sho43.xyz
    
    # SSL設定はCertbotが自動設定
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    ProxyPass /socket.io/ ws://localhost:3001/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3001/socket.io/
    
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</VirtualHost>
EOF

# Apache設定テスト
sudo httpd -t
sudo systemctl restart httpd

log_info "=== Phase 9: PM2設定 ==="
cd $PROJECT_DIR

# ログディレクトリ作成
sudo mkdir -p /var/log/questboard
sudo chown $USER:$USER /var/log/questboard

# PM2設定ファイル作成
tee ecosystem.config.js > /dev/null << 'EOF'
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
    max_memory_restart: '1G',
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }]
};
EOF

# PM2でアプリケーション起動
pm2 delete questboard-api 2>/dev/null || true
pm2 start ecosystem.config.js

# PM2自動起動設定
pm2 startup systemd -u $USER --hp $HOME
pm2 save

log_info "=== Phase 10: SSL証明書設定 ==="
if ! command -v certbot &> /dev/null; then
    sudo dnf install -y certbot python3-certbot-apache
fi

log_info "SSL証明書の取得は手動で実行してください:"
log_info "sudo certbot --apache -d $DOMAIN -d $API_DOMAIN"

log_info "=== Phase 11: バックアップ設定 ==="
sudo mkdir -p /var/backups/questboard
sudo chown $USER:$USER /var/backups/questboard

tee /var/backups/questboard/backup.sh > /dev/null << 'EOF'
#!/bin/bash
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
EOF

chmod +x /var/backups/questboard/backup.sh

# cron設定（日次バックアップ）
(crontab -l 2>/dev/null; echo "0 2 * * * /var/backups/questboard/backup.sh >> /var/log/questboard/backup.log 2>&1") | crontab -

log_info "=== デプロイ完了! ==="
log_info "PM2 ステータス:"
pm2 status

log_info "次の手順を手動で完了してください:"
log_info "1. DNS設定: $DOMAIN と $API_DOMAIN をこのサーバーのIPに設定"
log_info "2. SSL証明書取得: sudo certbot --apache -d $DOMAIN -d $API_DOMAIN"
log_info "3. .env ファイルの設定完了: $PROJECT_DIR/backend/.env"
log_info "4. PostgreSQL データベース設定"
log_info "5. Google OAuth設定"

log_info "完了後のアクセスURL:"
log_info "- メインサイト: https://$DOMAIN"
log_info "- API: https://$API_DOMAIN"

ENDSSH

log_info "ConoHa VPS へのデプロイが完了しました!"
log_info "サーバーにSSHして手動設定を完了してください。"

echo "
🎉 デプロイ完了!

次の手順:
1. DNS設定を確認
2. SSL証明書を取得
3. .env ファイルを設定
4. PostgreSQL設定を完了
5. アプリケーションの動作確認

詳細は docs/02-guides/conoha-deployment-guide.md を参照してください。
"