#!/bin/bash

# Docker デプロイメントスクリプト
set -e

# カラー出力の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# 環境変数チェック
check_env() {
    log "環境変数をチェックしています..."
    
    if [ ! -f .env ]; then
        error ".envファイルが見つかりません。.env.docker.exampleをコピーして設定してください。"
    fi

    # 必須環境変数のチェック
    required_vars=(
        "JWT_SECRET"
        "GOOGLE_CLIENT_ID"
        "DB_PASSWORD"
        "REDIS_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=your-" .env; then
            error "${var} が設定されていません。.envファイルを確認してください。"
        fi
    done

    log "環境変数チェック完了"
}

# Dockerのインストール確認
check_docker() {
    log "Docker環境をチェックしています..."
    
    if ! command -v docker &> /dev/null; then
        error "Dockerがインストールされていません"
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Composeがインストールされていません"
    fi

    # Docker daemonが動作しているか確認
    if ! docker info &> /dev/null; then
        error "Docker daemonが起動していません"
    fi

    log "Docker環境チェック完了"
}

# ディレクトリ作成
create_directories() {
    log "必要なディレクトリを作成しています..."
    
    directories=(
        "backups"
        "backend/logs"
        "backend/data/quests"
    )

    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log "ディレクトリ作成: $dir"
    done
}

# 既存のコンテナを停止
stop_existing() {
    log "既存のコンテナを停止しています..."
    
    if docker-compose ps -q | grep -q .; then
        docker-compose down
        log "既存のコンテナを停止しました"
    else
        log "実行中のコンテナはありません"
    fi
}

# Dockerイメージのビルド
build_images() {
    log "Dockerイメージをビルドしています..."
    
    # キャッシュを使用してビルド
    docker-compose build --parallel
    
    if [ $? -eq 0 ]; then
        log "イメージのビルドが完了しました"
    else
        error "イメージのビルドに失敗しました"
    fi
}

# サービスの起動
start_services() {
    log "サービスを起動しています..."
    
    # 本番環境の設定を適用
    if [ "$1" == "prod" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    if [ $? -eq 0 ]; then
        log "サービスの起動が完了しました"
    else
        error "サービスの起動に失敗しました"
    fi
}

# ヘルスチェック
health_check() {
    log "ヘルスチェックを実行しています..."
    
    services=("postgres" "redis" "elasticsearch" "backend" "frontend")
    max_attempts=30
    
    for service in "${services[@]}"; do
        attempt=1
        while [ $attempt -le $max_attempts ]; do
            if docker-compose ps | grep -q "${service}.*healthy"; then
                log "${service} は正常に起動しています"
                break
            elif [ $attempt -eq $max_attempts ]; then
                error "${service} の起動に失敗しました"
            else
                echo -n "."
                sleep 2
                ((attempt++))
            fi
        done
    done
    
    log "全てのサービスが正常に起動しました"
}

# データベースマイグレーション
run_migrations() {
    log "データベースマイグレーションを実行しています..."
    
    # マイグレーションコマンドを実行
    docker-compose exec -T backend npm run migrate
    
    if [ $? -eq 0 ]; then
        log "マイグレーションが完了しました"
    else
        warning "マイグレーションに失敗しました。手動で実行が必要かもしれません"
    fi
}

# ステータス表示
show_status() {
    log "サービスステータス:"
    docker-compose ps
    
    echo ""
    log "アクセスURL:"
    echo "  - フロントエンド: http://localhost:${FRONTEND_PORT:-80}"
    echo "  - バックエンドAPI: http://localhost:${BACKEND_PORT:-3001}"
    echo "  - API ドキュメント: http://localhost:${BACKEND_PORT:-3001}/api/docs"
    
    if [ "$1" == "dev" ]; then
        echo "  - Adminer (DB管理): http://localhost:${ADMINER_PORT:-8080}"
    fi
}

# メイン処理
main() {
    log "Quest Board Dockerデプロイを開始します"
    
    # 引数チェック
    MODE=${1:-dev}
    
    if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
        error "使用方法: $0 [dev|prod]"
    fi
    
    log "モード: $MODE"
    
    # 各処理を実行
    check_env
    check_docker
    create_directories
    stop_existing
    build_images
    start_services "$MODE"
    health_check
    run_migrations
    show_status "$MODE"
    
    log "デプロイが完了しました！"
}

# スクリプト実行
main "$@"