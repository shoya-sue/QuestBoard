#!/bin/bash

# Kubernetes デプロイメントスクリプト
set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# デフォルト値
NAMESPACE="questboard"
ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}
DOCKER_REGISTRY="ghcr.io/your-org"

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 前提条件チェック
check_prerequisites() {
    log "前提条件をチェックしています..."
    
    # kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl がインストールされていません"
    fi
    
    # クラスター接続確認
    if ! kubectl cluster-info &> /dev/null; then
        error "Kubernetes クラスターに接続できません"
    fi
    
    # Helm（オプション）
    if command -v helm &> /dev/null; then
        info "Helm が利用可能です"
    else
        warning "Helm がインストールされていません（一部機能が制限されます）"
    fi
    
    log "前提条件チェック完了"
}

# Namespace作成
create_namespace() {
    log "Namespace を作成しています..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        info "Namespace '$NAMESPACE' は既に存在します"
    else
        kubectl create namespace $NAMESPACE
        kubectl label namespace $NAMESPACE environment=$ENVIRONMENT
        log "Namespace '$NAMESPACE' を作成しました"
    fi
}

# Secretの適用
apply_secrets() {
    log "Secret を適用しています..."
    
    # 環境別のシークレットファイルをチェック
    SECRET_FILE="k8s/secret.$ENVIRONMENT.yaml"
    if [ ! -f "$SECRET_FILE" ]; then
        warning "環境別シークレットファイルが見つかりません: $SECRET_FILE"
        warning "デフォルトのシークレットファイルを使用します"
        SECRET_FILE="k8s/secret.yaml"
    fi
    
    if [ -f "$SECRET_FILE" ]; then
        kubectl apply -f "$SECRET_FILE"
        log "Secret を適用しました"
    else
        error "シークレットファイルが見つかりません: $SECRET_FILE"
    fi
}

# ConfigMapの適用
apply_configmaps() {
    log "ConfigMap を適用しています..."
    
    kubectl apply -f k8s/configmap.yaml
    
    # 環境別のConfigMap
    if [ -f "k8s/configmap.$ENVIRONMENT.yaml" ]; then
        kubectl apply -f "k8s/configmap.$ENVIRONMENT.yaml"
    fi
    
    log "ConfigMap を適用しました"
}

# データベースのデプロイ
deploy_database() {
    log "データベースをデプロイしています..."
    
    kubectl apply -f k8s/postgres.yaml
    
    # PostgreSQLの起動を待つ
    log "PostgreSQL の起動を待っています..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    log "データベースのデプロイが完了しました"
}

# Redisのデプロイ
deploy_redis() {
    log "Redis をデプロイしています..."
    
    kubectl apply -f k8s/redis.yaml
    
    # Redisの起動を待つ
    log "Redis の起動を待っています..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=120s
    
    log "Redis のデプロイが完了しました"
}

# Elasticsearchのデプロイ
deploy_elasticsearch() {
    log "Elasticsearch をデプロイしています..."
    
    kubectl apply -f k8s/elasticsearch.yaml
    
    # Elasticsearchの起動を待つ（時間がかかる）
    log "Elasticsearch の起動を待っています（これには数分かかる場合があります）..."
    kubectl wait --for=condition=ready pod -l app=elasticsearch -n $NAMESPACE --timeout=600s
    
    log "Elasticsearch のデプロイが完了しました"
}

# アプリケーションのデプロイ
deploy_application() {
    log "アプリケーションをデプロイしています..."
    
    # イメージタグの更新
    if [ "$IMAGE_TAG" != "latest" ]; then
        log "イメージタグを更新しています: $IMAGE_TAG"
        
        # Backend
        kubectl set image deployment/backend backend=$DOCKER_REGISTRY/questboard-backend:$IMAGE_TAG -n $NAMESPACE
        
        # Frontend
        kubectl set image deployment/frontend frontend=$DOCKER_REGISTRY/questboard-frontend:$IMAGE_TAG -n $NAMESPACE
    else
        # マニフェストファイルの適用
        kubectl apply -f k8s/backend.yaml
        kubectl apply -f k8s/frontend.yaml
    fi
    
    # HPAの適用
    kubectl apply -f k8s/hpa.yaml
    
    # サービスの適用
    log "アプリケーションのデプロイが完了しました"
}

# Ingressの設定
setup_ingress() {
    log "Ingress を設定しています..."
    
    # Ingress Controllerの確認
    if ! kubectl get pods -n ingress-nginx | grep -q nginx-ingress-controller; then
        warning "Nginx Ingress Controller が見つかりません"
        info "Ingress Controller をインストールしてください:"
        info "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml"
    fi
    
    # cert-managerの確認
    if ! kubectl get pods -n cert-manager | grep -q cert-manager; then
        warning "cert-manager が見つかりません"
        info "cert-manager をインストールしてください:"
        info "kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
    fi
    
    # Ingressの適用
    kubectl apply -f k8s/ingress.yaml
    
    log "Ingress の設定が完了しました"
}

# Network Policyの適用
apply_network_policies() {
    log "Network Policy を適用しています..."
    
    kubectl apply -f k8s/network-policy.yaml
    
    log "Network Policy を適用しました"
}

# デプロイメントの検証
verify_deployment() {
    log "デプロイメントを検証しています..."
    
    # Podの状態確認
    echo ""
    info "Pod の状態:"
    kubectl get pods -n $NAMESPACE
    
    # サービスの確認
    echo ""
    info "サービス:"
    kubectl get svc -n $NAMESPACE
    
    # Ingressの確認
    echo ""
    info "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    # HPAの確認
    echo ""
    info "HPA:"
    kubectl get hpa -n $NAMESPACE
    
    # エンドポイントの確認
    echo ""
    info "エンドポイント:"
    kubectl get endpoints -n $NAMESPACE
    
    log "デプロイメントの検証が完了しました"
}

# ヘルスチェック
health_check() {
    log "ヘルスチェックを実行しています..."
    
    # Backend APIのヘルスチェック
    BACKEND_POD=$(kubectl get pod -l app=backend -n $NAMESPACE -o jsonpath="{.items[0].metadata.name}")
    if [ -n "$BACKEND_POD" ]; then
        kubectl exec -n $NAMESPACE $BACKEND_POD -- wget -qO- http://localhost:3001/api/docs/health || warning "Backend ヘルスチェック失敗"
    fi
    
    # Frontend のヘルスチェック
    FRONTEND_POD=$(kubectl get pod -l app=frontend -n $NAMESPACE -o jsonpath="{.items[0].metadata.name}")
    if [ -n "$FRONTEND_POD" ]; then
        kubectl exec -n $NAMESPACE $FRONTEND_POD -- wget -qO- http://localhost/health || warning "Frontend ヘルスチェック失敗"
    fi
    
    log "ヘルスチェックが完了しました"
}

# ロールバック
rollback() {
    log "ロールバックを実行しています..."
    
    # Backend のロールバック
    kubectl rollout undo deployment/backend -n $NAMESPACE
    
    # Frontend のロールバック
    kubectl rollout undo deployment/frontend -n $NAMESPACE
    
    # ロールアウトの完了を待つ
    kubectl rollout status deployment/backend -n $NAMESPACE
    kubectl rollout status deployment/frontend -n $NAMESPACE
    
    log "ロールバックが完了しました"
}

# メイン処理
main() {
    log "Quest Board Kubernetes デプロイメントを開始します"
    log "環境: $ENVIRONMENT"
    log "イメージタグ: $IMAGE_TAG"
    
    case ${3:-deploy} in
        deploy)
            check_prerequisites
            create_namespace
            apply_secrets
            apply_configmaps
            deploy_database
            deploy_redis
            deploy_elasticsearch
            deploy_application
            setup_ingress
            apply_network_policies
            verify_deployment
            health_check
            log "✅ デプロイメントが完了しました！"
            ;;
        rollback)
            rollback
            ;;
        verify)
            verify_deployment
            health_check
            ;;
        *)
            echo "使用方法: $0 <environment> <image-tag> [deploy|rollback|verify]"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"