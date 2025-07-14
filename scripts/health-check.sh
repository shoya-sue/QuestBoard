#!/bin/bash

# ヘルスチェックスクリプト
set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 環境設定
ENVIRONMENT=${1:-staging}
BASE_URL=${2:-https://${ENVIRONMENT}.questboard.example.com}
TIMEOUT=10
MAX_RETRIES=3

# ヘルスチェック結果
HEALTH_STATUS="healthy"
FAILED_CHECKS=()

# ログ関数
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# HTTPヘルスチェック
http_check() {
    local endpoint=$1
    local expected_status=${2:-200}
    local retry=0
    
    while [ $retry -lt $MAX_RETRIES ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" -m $TIMEOUT "$BASE_URL$endpoint" || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            return 0
        fi
        
        ((retry++))
        sleep 2
    done
    
    return 1
}

# レスポンスタイムチェック
response_time_check() {
    local endpoint=$1
    local max_time=${2:-2000} # ミリ秒
    
    response_time=$(curl -s -o /dev/null -w "%{time_total}" -m $TIMEOUT "$BASE_URL$endpoint" || echo "999")
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    if [ "$response_time_ms" -lt "$max_time" ]; then
        return 0
    fi
    
    return 1
}

# APIエンドポイントチェック
api_endpoint_check() {
    local endpoint=$1
    local method=${2:-GET}
    
    response=$(curl -s -X $method -m $TIMEOUT "$BASE_URL/api$endpoint" -H "Content-Type: application/json")
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        return 0
    fi
    
    return 1
}

# データベース接続チェック
database_check() {
    if [ "$ENVIRONMENT" = "production" ]; then
        # 本番環境では管理APIを使用
        if http_check "/api/admin/health/database" 200; then
            return 0
        fi
    fi
    return 1
}

# Redis接続チェック
redis_check() {
    if [ "$ENVIRONMENT" = "production" ]; then
        # 本番環境では管理APIを使用
        if http_check "/api/admin/health/redis" 200; then
            return 0
        fi
    fi
    return 1
}

# Elasticsearch接続チェック
elasticsearch_check() {
    if [ "$ENVIRONMENT" = "production" ]; then
        # 本番環境では管理APIを使用
        if http_check "/api/admin/health/elasticsearch" 200; then
            return 0
        fi
    fi
    return 1
}

# メイン処理
main() {
    echo "========================================="
    echo "Health Check for: $ENVIRONMENT"
    echo "URL: $BASE_URL"
    echo "Time: $(date)"
    echo "========================================="
    echo ""
    
    # 基本的なヘルスチェック
    echo "1. Basic Health Checks:"
    
    if http_check "/api/docs/health" 200; then
        log_success "API Health endpoint"
    else
        log_error "API Health endpoint"
        FAILED_CHECKS+=("API Health")
        HEALTH_STATUS="unhealthy"
    fi
    
    if http_check "/" 200; then
        log_success "Frontend"
    else
        log_error "Frontend"
        FAILED_CHECKS+=("Frontend")
        HEALTH_STATUS="unhealthy"
    fi
    
    if http_check "/api/docs" 200; then
        log_success "API Documentation"
    else
        log_warning "API Documentation (non-critical)"
    fi
    
    # レスポンスタイムチェック
    echo ""
    echo "2. Response Time Checks:"
    
    if response_time_check "/" 2000; then
        log_success "Frontend response time (<2s)"
    else
        log_warning "Frontend response time (>2s)"
    fi
    
    if response_time_check "/api/docs/health" 500; then
        log_success "API response time (<500ms)"
    else
        log_warning "API response time (>500ms)"
    fi
    
    # APIエンドポイントチェック
    echo ""
    echo "3. API Endpoint Checks:"
    
    if api_endpoint_check "/quests" GET; then
        log_success "GET /api/quests"
    else
        log_error "GET /api/quests"
        FAILED_CHECKS+=("Quest API")
        HEALTH_STATUS="unhealthy"
    fi
    
    if api_endpoint_check "/users/leaderboard" GET; then
        log_success "GET /api/users/leaderboard"
    else
        log_warning "GET /api/users/leaderboard (non-critical)"
    fi
    
    # サービス接続チェック
    echo ""
    echo "4. Service Connectivity:"
    
    if database_check; then
        log_success "Database connection"
    else
        log_error "Database connection"
        FAILED_CHECKS+=("Database")
        HEALTH_STATUS="unhealthy"
    fi
    
    if redis_check; then
        log_success "Redis connection"
    else
        log_warning "Redis connection (non-critical)"
    fi
    
    if elasticsearch_check; then
        log_success "Elasticsearch connection"
    else
        log_warning "Elasticsearch connection (non-critical)"
    fi
    
    # 結果サマリー
    echo ""
    echo "========================================="
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}Overall Status: HEALTHY${NC}"
        exit 0
    else
        echo -e "${RED}Overall Status: UNHEALTHY${NC}"
        echo "Failed checks: ${FAILED_CHECKS[*]}"
        exit 1
    fi
}

# スクリプト実行
main