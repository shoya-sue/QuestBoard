#!/bin/bash

# セキュリティテスト実行スクリプト
# 全体的なセキュリティ監査とペネトレーションテストを実行

set -euo pipefail

# 色付きメッセージ用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログファイル
LOG_FILE="security-test-$(date +%Y%m%d_%H%M%S).log"
SECURITY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SECURITY_DIR")"

echo -e "${BLUE}🛡️  QuestBoard セキュリティテストスイート${NC}"
echo "========================================"
echo "開始時刻: $(date)"
echo "プロジェクトルート: $PROJECT_ROOT"
echo "ログファイル: $LOG_FILE"
echo ""

# 関数定義
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${GREEN}ℹ️  INFO: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# 前提条件チェック
check_prerequisites() {
    info "前提条件をチェック中..."
    
    # Node.jsの確認
    if ! command -v node &> /dev/null; then
        error "Node.js がインストールされていません"
        exit 1
    fi
    
    # npmの確認
    if ! command -v npm &> /dev/null; then
        error "npm がインストールされていません"
        exit 1
    fi
    
    # Dockerの確認
    if ! command -v docker &> /dev/null; then
        warning "Docker がインストールされていません。一部のテストをスキップします"
    fi
    
    # 必要なディレクトリの確認
    if [ ! -d "$PROJECT_ROOT/backend" ]; then
        error "backend ディレクトリが見つかりません"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/frontend" ]; then
        error "frontend ディレクトリが見つかりません"
        exit 1
    fi
    
    success "前提条件チェック完了"
}

# 依存関係の脆弱性チェック
check_dependencies() {
    info "依存関係の脆弱性をチェック中..."
    
    # Backend dependencies
    if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
        log "Backend 依存関係をチェック中..."
        cd "$PROJECT_ROOT/backend"
        
        # npm audit
        if npm audit --audit-level=moderate 2>&1 | tee -a "$SECURITY_DIR/$LOG_FILE"; then
            success "Backend: 重要な脆弱性は見つかりませんでした"
        else
            warning "Backend: 脆弱性が発見されました。npm audit fix を検討してください"
        fi
        
        # outdated packages
        log "Backend: 古いパッケージをチェック中..."
        npm outdated 2>&1 | tee -a "$SECURITY_DIR/$LOG_FILE" || true
    fi
    
    # Frontend dependencies
    if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        log "Frontend 依存関係をチェック中..."
        cd "$PROJECT_ROOT/frontend"
        
        # npm audit
        if npm audit --audit-level=moderate 2>&1 | tee -a "$SECURITY_DIR/$LOG_FILE"; then
            success "Frontend: 重要な脆弱性は見つかりませんでした"
        else
            warning "Frontend: 脆弱性が発見されました。npm audit fix を検討してください"
        fi
        
        # outdated packages
        log "Frontend: 古いパッケージをチェック中..."
        npm outdated 2>&1 | tee -a "$SECURITY_DIR/$LOG_FILE" || true
    fi
    
    cd "$SECURITY_DIR"
}

# セキュリティ監査の実行
run_security_audit() {
    info "セキュリティ監査を実行中..."
    
    if [ -f "$SECURITY_DIR/security-audit.js" ]; then
        node "$SECURITY_DIR/security-audit.js" 2>&1 | tee -a "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            success "セキュリティ監査完了"
        else
            error "セキュリティ監査でエラーが発生しました"
        fi
    else
        error "security-audit.js が見つかりません"
    fi
}

# ペネトレーションテストの実行
run_penetration_test() {
    info "ペネトレーションテストを実行中..."
    
    # アプリケーションが起動しているかチェック
    local app_url="${1:-http://localhost:3000}"
    
    if curl -f -s "$app_url/api/health" > /dev/null 2>&1; then
        info "アプリケーションが起動しています。ペネトレーションテストを開始..."
        
        if [ -f "$SECURITY_DIR/penetration-test.js" ]; then
            node "$SECURITY_DIR/penetration-test.js" "$app_url" 2>&1 | tee -a "$LOG_FILE"
            
            if [ $? -eq 0 ]; then
                success "ペネトレーションテスト完了"
            else
                error "ペネトレーションテストでエラーが発生しました"
            fi
        else
            error "penetration-test.js が見つかりません"
        fi
    else
        warning "アプリケーションが起動していません ($app_url)"
        warning "ペネトレーションテストをスキップします"
        info "アプリケーションを起動してから再実行してください:"
        info "  cd backend && npm start"
    fi
}

# Docker セキュリティチェック
check_docker_security() {
    info "Docker セキュリティをチェック中..."
    
    if command -v docker &> /dev/null; then
        # Dockerfile のセキュリティチェック
        for dockerfile in "$PROJECT_ROOT"/Dockerfile*; do
            if [ -f "$dockerfile" ]; then
                log "Dockerfile をチェック中: $(basename "$dockerfile")"
                
                # rootユーザー使用チェック
                if ! grep -q "USER " "$dockerfile"; then
                    warning "$(basename "$dockerfile"): USER 指定がありません（rootユーザーで実行される可能性）"
                fi
                
                # セキュリティアップデートチェック
                if ! grep -q "apt.*upgrade\|yum.*update\|apk.*upgrade" "$dockerfile"; then
                    warning "$(basename "$dockerfile"): セキュリティアップデートが含まれていません"
                fi
                
                # 機密情報ハードコーディングチェック
                if grep -i "password\|secret\|key" "$dockerfile"; then
                    error "$(basename "$dockerfile"): 機密情報がハードコーディングされている可能性があります"
                fi
            fi
        done
        
        # Docker Compose セキュリティチェック
        if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
            log "docker-compose.yml をチェック中..."
            
            # privileged モードチェック
            if grep -q "privileged.*true" "$PROJECT_ROOT/docker-compose.yml"; then
                error "docker-compose.yml: privileged モードが使用されています"
            fi
            
            # ネットワークモードチェック
            if grep -q "network_mode.*host" "$PROJECT_ROOT/docker-compose.yml"; then
                warning "docker-compose.yml: host ネットワークモードが使用されています"
            fi
        fi
        
        success "Docker セキュリティチェック完了"
    else
        warning "Docker がインストールされていないため、Docker セキュリティチェックをスキップします"
    fi
}

# ファイル権限チェック
check_file_permissions() {
    info "ファイル権限をチェック中..."
    
    # 機密ファイルの権限チェック
    sensitive_files=(
        ".env"
        ".env.local"
        ".env.production"
        "config/database.js"
        "config/auth.js"
        "scripts/backup.sh"
        "scripts/deploy.sh"
    )
    
    for file in "${sensitive_files[@]}"; do
        filepath="$PROJECT_ROOT/$file"
        if [ -f "$filepath" ]; then
            permissions=$(stat -c "%a" "$filepath" 2>/dev/null || stat -f "%A" "$filepath" 2>/dev/null || echo "unknown")
            
            if [ "$permissions" != "600" ] && [ "$permissions" != "644" ]; then
                warning "$file: 権限が適切でない可能性があります ($permissions)"
                info "推奨: chmod 600 $file"
            else
                log "$file: 権限OK ($permissions)"
            fi
        fi
    done
    
    # 実行可能ファイルの権限チェック
    find "$PROJECT_ROOT" -name "*.sh" -type f | while read -r script; do
        if [ -f "$script" ]; then
            permissions=$(stat -c "%a" "$script" 2>/dev/null || stat -f "%A" "$script" 2>/dev/null || echo "unknown")
            if [ "$permissions" != "755" ] && [ "$permissions" != "750" ]; then
                warning "$(basename "$script"): 実行権限が適切でない可能性があります ($permissions)"
            fi
        fi
    done
    
    success "ファイル権限チェック完了"
}

# SSL/TLS 設定チェック
check_ssl_configuration() {
    info "SSL/TLS 設定をチェック中..."
    
    # SSL証明書ファイルの確認
    ssl_files=(
        "ssl/cert.pem"
        "ssl/private.key"
        "nginx/ssl"
        "certs"
    )
    
    for ssl_path in "${ssl_files[@]}"; do
        if [ -e "$PROJECT_ROOT/$ssl_path" ]; then
            log "SSL関連ファイルが見つかりました: $ssl_path"
            
            # 証明書の有効期限チェック（openssl が利用可能な場合）
            if command -v openssl &> /dev/null; then
                find "$PROJECT_ROOT/$ssl_path" -name "*.pem" -o -name "*.crt" | while read -r cert; do
                    if [ -f "$cert" ]; then
                        expiry=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2 || echo "unknown")
                        if [ "$expiry" != "unknown" ]; then
                            log "証明書有効期限 ($(basename "$cert")): $expiry"
                        fi
                    fi
                done
            fi
        fi
    done
    
    # Nginx SSL設定チェック
    if [ -f "$PROJECT_ROOT/nginx.conf" ] || [ -f "$PROJECT_ROOT/nginx/nginx.conf" ]; then
        log "Nginx SSL設定をチェック中..."
        
        nginx_conf=""
        [ -f "$PROJECT_ROOT/nginx.conf" ] && nginx_conf="$PROJECT_ROOT/nginx.conf"
        [ -f "$PROJECT_ROOT/nginx/nginx.conf" ] && nginx_conf="$PROJECT_ROOT/nginx/nginx.conf"
        
        if [ -n "$nginx_conf" ]; then
            # SSL設定の確認
            if grep -q "ssl_protocols.*TLSv1\.3\|ssl_protocols.*TLSv1\.2" "$nginx_conf"; then
                success "Nginx: 適切なTLSバージョンが設定されています"
            else
                warning "Nginx: TLS設定を確認してください"
            fi
            
            # セキュリティヘッダーの確認
            if grep -q "add_header.*Strict-Transport-Security" "$nginx_conf"; then
                success "Nginx: HSTS ヘッダーが設定されています"
            else
                warning "Nginx: HSTS ヘッダーが設定されていません"
            fi
        fi
    fi
    
    success "SSL/TLS 設定チェック完了"
}

# レポート生成
generate_report() {
    info "最終レポートを生成中..."
    
    local report_file="security-test-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# QuestBoard セキュリティテストレポート

**実行日時**: $(date)  
**実行者**: $(whoami)  
**プロジェクトルート**: $PROJECT_ROOT  

## 実行されたテスト

1. ✅ 前提条件チェック
2. ✅ 依存関係脆弱性チェック
3. ✅ セキュリティ監査
4. ✅ ペネトレーションテスト
5. ✅ Docker セキュリティチェック
6. ✅ ファイル権限チェック
7. ✅ SSL/TLS 設定チェック

## 生成されたファイル

EOF

    # 生成されたJSONレポートファイルを確認
    if [ -f "$SECURITY_DIR/security-audit-report.json" ]; then
        echo "- 📄 セキュリティ監査詳細: security-audit-report.json" >> "$report_file"
    fi
    
    if [ -f "$SECURITY_DIR/penetration-test-report.json" ]; then
        echo "- 📄 ペネトレーションテスト詳細: penetration-test-report.json" >> "$report_file"
    fi
    
    echo "- 📄 実行ログ: $LOG_FILE" >> "$report_file"
    
    cat >> "$report_file" << EOF

## 推奨事項

1. **定期的な依存関係更新**: \`npm audit fix\` を定期実行
2. **セキュリティヘッダー確認**: 本番環境でのヘッダー設定確認
3. **SSL証明書更新**: 証明書の有効期限を定期チェック
4. **ログ監視**: セキュリティイベントの監視設定
5. **バックアップ検証**: バックアップの完全性確認

## 次のステップ

1. 発見された脆弱性の修正
2. セキュリティポリシーの更新
3. 本番環境でのセキュリティテスト実行
4. セキュリティ監視の強化

---

**注意**: このレポートには機密情報が含まれる可能性があります。適切に管理してください。
EOF

    success "レポート生成完了: $report_file"
}

# メイン実行
main() {
    local app_url="${1:-http://localhost:3000}"
    
    check_prerequisites
    check_dependencies
    check_docker_security
    check_file_permissions
    check_ssl_configuration
    run_security_audit
    run_penetration_test "$app_url"
    generate_report
    
    echo ""
    echo -e "${GREEN}🎉 セキュリティテスト完了!${NC}"
    echo -e "${BLUE}ログファイル: $LOG_FILE${NC}"
    echo ""
    echo "次の手順:"
    echo "1. 生成されたレポートを確認"
    echo "2. 発見された問題を修正"
    echo "3. 本番環境でテストを実行"
}

# スクリプト実行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi