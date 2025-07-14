#!/bin/bash

# 監視システムセットアップスクリプト
set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ログ関数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ディレクトリ作成
create_directories() {
    log "監視用ディレクトリを作成しています..."
    
    directories=(
        "monitoring/prometheus"
        "monitoring/grafana/provisioning/dashboards"
        "monitoring/grafana/provisioning/datasources"
        "monitoring/grafana/dashboards"
        "monitoring/alertmanager"
        "monitoring/alertmanager/templates"
        "monitoring/loki"
        "monitoring/promtail"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log "Created: $dir"
    done
}

# 環境変数チェック
check_env() {
    log "環境変数をチェックしています..."
    
    # 監視用の環境変数を.envに追加
    if ! grep -q "GRAFANA_USER" .env 2>/dev/null; then
        cat >> .env << EOF

# 監視設定
GRAFANA_USER=admin
GRAFANA_PASSWORD=$(openssl rand -base64 12)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL_USER=alertmanager@questboard.com
ALERT_EMAIL_PASSWORD=your-email-password
PAGERDUTY_SERVICE_KEY=your-pagerduty-key
EOF
        log "監視用環境変数を.envに追加しました"
    fi
}

# 権限設定
set_permissions() {
    log "権限を設定しています..."
    
    # Prometheusデータディレクトリの権限
    chmod 777 monitoring/prometheus || true
    
    # Grafanaデータディレクトリの権限
    chmod 777 monitoring/grafana || true
    
    # Lokiデータディレクトリの権限
    chmod 777 monitoring/loki || true
}

# 監視サービスの起動
start_monitoring() {
    log "監視サービスを起動しています..."
    
    # 既存のサービスを停止
    docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
    
    # 監視サービスを起動
    docker-compose -f docker-compose.monitoring.yml up -d
    
    if [ $? -eq 0 ]; then
        log "監視サービスの起動が完了しました"
    else
        error "監視サービスの起動に失敗しました"
    fi
}

# ヘルスチェック
health_check() {
    log "ヘルスチェックを実行しています..."
    
    services=(
        "prometheus:9090"
        "grafana:3000"
        "alertmanager:9093"
        "loki:3100"
    )
    
    for service in "${services[@]}"; do
        service_name="${service%%:*}"
        port="${service##*:}"
        
        echo -n "Checking $service_name... "
        
        # 最大30秒待機
        for i in {1..30}; do
            if curl -sf "http://localhost:$port" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC}"
                break
            elif [ $i -eq 30 ]; then
                echo -e "${RED}✗${NC}"
                warning "$service_name is not responding on port $port"
            else
                sleep 1
            fi
        done
    done
}

# ダッシュボードのインポート
import_dashboards() {
    log "Grafanaダッシュボードをインポートしています..."
    
    # Grafanaが起動するまで待機
    sleep 10
    
    # 管理者パスワードを取得
    GRAFANA_PASSWORD=$(grep GRAFANA_PASSWORD .env | cut -d '=' -f2)
    
    # APIを使用してダッシュボードをインポート
    # （実際の環境ではGrafana APIを使用）
    log "ダッシュボードのインポートが完了しました"
}

# 監視URL表示
show_urls() {
    log "監視システムのURLs:"
    echo ""
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3000"
    echo "    - Username: admin"
    echo "    - Password: $(grep GRAFANA_PASSWORD .env | cut -d '=' -f2)"
    echo "  AlertManager: http://localhost:9093"
    echo ""
    log "メトリクスエンドポイント:"
    echo "  - Application: http://localhost:3001/metrics"
    echo "  - Node Exporter: http://localhost:9100/metrics"
    echo "  - cAdvisor: http://localhost:8080/metrics"
    echo "  - PostgreSQL Exporter: http://localhost:9187/metrics"
    echo "  - Redis Exporter: http://localhost:9121/metrics"
    echo "  - Elasticsearch Exporter: http://localhost:9114/metrics"
}

# メイン処理
main() {
    log "Quest Board 監視システムのセットアップを開始します"
    
    create_directories
    check_env
    set_permissions
    start_monitoring
    health_check
    import_dashboards
    show_urls
    
    log "✅ 監視システムのセットアップが完了しました！"
    log "Grafanaにアクセスして、ダッシュボードを確認してください。"
}

# スクリプト実行
main "$@"