#!/bin/bash

# Terraform デプロイメントスクリプト
set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# デフォルト値
ENVIRONMENT=${1:-production}
ACTION=${2:-plan}
AUTO_APPROVE=${3:-false}

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
    
    # Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform がインストールされていません"
    fi
    
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    info "Terraform version: $tf_version"
    
    # AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI がインストールされていません"
    fi
    
    # AWS認証情報確認
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS認証情報が設定されていません"
    fi
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local aws_region=$(aws configure get region)
    info "AWS Account: $aws_account"
    info "AWS Region: $aws_region"
    
    # jq
    if ! command -v jq &> /dev/null; then
        error "jq がインストールされていません"
    fi
    
    log "前提条件チェック完了"
}

# Terraform環境の初期化
terraform_init() {
    log "Terraform を初期化しています..."
    
    cd terraform
    
    # backend設定の確認
    if [ ! -f "terraform.tfvars" ]; then
        warning "terraform.tfvars が見つかりません"
        info "terraform.tfvars.example をコピーして設定してください"
    fi
    
    # S3バケットとDynamoDBテーブルの存在確認
    local state_bucket="questboard-terraform-state"
    local lock_table="questboard-terraform-lock"
    
    if ! aws s3 ls "s3://$state_bucket" &> /dev/null; then
        warning "Terraform state bucket が存在しません: $state_bucket"
        info "手動で作成するか、backend設定を無効にしてください"
    fi
    
    if ! aws dynamodb describe-table --table-name "$lock_table" &> /dev/null; then
        warning "Terraform lock table が存在しません: $lock_table"
        info "手動で作成するか、backend設定を無効にしてください"
    fi
    
    # Terraform初期化
    terraform init -upgrade
    
    log "Terraform初期化完了"
}

# Terraform検証
terraform_validate() {
    log "Terraform設定を検証しています..."
    
    terraform validate
    
    if [ $? -eq 0 ]; then
        log "Terraform検証成功"
    else
        error "Terraform検証失敗"
    fi
}

# Terraform計画
terraform_plan() {
    log "Terraform plan を実行しています..."
    
    local plan_file="tfplan-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
    
    terraform plan \
        -var-file="environments/${ENVIRONMENT}.tfvars" \
        -out="$plan_file" \
        -detailed-exitcode
    
    local exit_code=$?
    
    case $exit_code in
        0)
            info "変更はありません"
            rm -f "$plan_file"
            ;;
        1)
            error "Terraform plan が失敗しました"
            ;;
        2)
            info "変更が検出されました"
            echo ""
            log "Plan file: $plan_file"
            echo ""
            
            # Plan の詳細を表示
            terraform show "$plan_file"
            
            if [ "$AUTO_APPROVE" != "true" ]; then
                echo ""
                read -p "この計画を適用しますか? (yes/no): " confirm
                if [ "$confirm" != "yes" ]; then
                    log "適用をキャンセルしました"
                    rm -f "$plan_file"
                    exit 0
                fi
            fi
            
            # Planファイルを保存（適用で使用）
            echo "$plan_file" > .terraform-plan-file
            ;;
    esac
}

# Terraform適用
terraform_apply() {
    log "Terraform apply を実行しています..."
    
    local plan_file=""
    
    # 既存のplanファイルがあるかチェック
    if [ -f ".terraform-plan-file" ]; then
        plan_file=$(cat .terraform-plan-file)
        if [ -f "$plan_file" ]; then
            log "既存のplanファイルを使用します: $plan_file"
        else
            warning "planファイルが見つかりません。新しくplanを作成します"
            plan_file=""
        fi
    fi
    
    if [ -z "$plan_file" ]; then
        # Planファイルがない場合は直接apply
        terraform apply \
            -var-file="environments/${ENVIRONMENT}.tfvars" \
            ${AUTO_APPROVE:+-auto-approve}
    else
        # Planファイルがある場合はそれを適用
        terraform apply ${AUTO_APPROVE:+-auto-approve} "$plan_file"
        
        # 適用後にplanファイルを削除
        rm -f "$plan_file" .terraform-plan-file
    fi
    
    if [ $? -eq 0 ]; then
        log "Terraform apply 完了"
        
        # 出力値を表示
        echo ""
        log "重要な出力値:"
        terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'
        
    else
        error "Terraform apply 失敗"
    fi
}

# Terraform破棄
terraform_destroy() {
    log "Terraform destroy を実行しています..."
    
    echo -e "${RED}警告: これにより全てのリソースが削除されます！${NC}"
    echo "環境: $ENVIRONMENT"
    echo ""
    
    if [ "$AUTO_APPROVE" != "true" ]; then
        read -p "本当に削除しますか? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "削除をキャンセルしました"
            exit 0
        fi
        
        read -p "もう一度確認します。本当に削除しますか? (DELETE/no): " confirm2
        if [ "$confirm2" != "DELETE" ]; then
            log "削除をキャンセルしました"
            exit 0
        fi
    fi
    
    terraform destroy \
        -var-file="environments/${ENVIRONMENT}.tfvars" \
        ${AUTO_APPROVE:+-auto-approve}
    
    if [ $? -eq 0 ]; then
        log "Terraform destroy 完了"
    else
        error "Terraform destroy 失敗"
    fi
}

# Terraform出力
terraform_output() {
    log "Terraform 出力値を表示しています..."
    
    terraform output -json | jq '.'
}

# インフラストラクチャ状態確認
check_infrastructure() {
    log "インフラストラクチャの状態を確認しています..."
    
    # EKSクラスター確認
    local cluster_name=$(terraform output -json | jq -r '.eks_cluster_name.value // empty')
    if [ -n "$cluster_name" ]; then
        local cluster_status=$(aws eks describe-cluster --name "$cluster_name" --query 'cluster.status' --output text 2>/dev/null || echo "NOT_FOUND")
        info "EKS Cluster ($cluster_name): $cluster_status"
    fi
    
    # RDS確認
    local rds_endpoint=$(terraform output -json | jq -r '.rds_endpoint.value // empty')
    if [ -n "$rds_endpoint" ]; then
        local rds_status=$(aws rds describe-db-instances --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "NOT_FOUND")
        info "RDS Instance: $rds_status"
    fi
    
    # ALB確認
    local alb_dns=$(terraform output -json | jq -r '.alb_dns_name.value // empty')
    if [ -n "$alb_dns" ]; then
        if curl -s --max-time 10 "http://$alb_dns" > /dev/null; then
            info "ALB ($alb_dns): アクセス可能"
        else
            warning "ALB ($alb_dns): アクセス不可"
        fi
    fi
}

#使用方法表示
show_usage() {
    echo "Quest Board Terraform デプロイメントスクリプト"
    echo ""
    echo "使用方法: $0 <environment> <action> [auto-approve]"
    echo ""
    echo "環境:"
    echo "  production  - 本番環境"
    echo "  staging     - ステージング環境"
    echo "  development - 開発環境"
    echo ""
    echo "アクション:"
    echo "  plan        - 変更計画を表示"
    echo "  apply       - 変更を適用"
    echo "  destroy     - リソースを削除"
    echo "  output      - 出力値を表示"
    echo "  check       - インフラ状態確認"
    echo ""
    echo "例:"
    echo "  $0 production plan"
    echo "  $0 production apply"
    echo "  $0 production apply true  # 自動承認"
    echo "  $0 production destroy"
}

# メイン処理
main() {
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    if [ $# -lt 2 ]; then
        show_usage
        exit 1
    fi
    
    log "Quest Board Terraform デプロイメントを開始します"
    log "環境: $ENVIRONMENT"
    log "アクション: $ACTION"
    
    check_prerequisites
    terraform_init
    terraform_validate
    
    case $ACTION in
        plan)
            terraform_plan
            ;;
        apply)
            terraform_apply
            check_infrastructure
            ;;
        destroy)
            terraform_destroy
            ;;
        output)
            terraform_output
            ;;
        check)
            check_infrastructure
            ;;
        *)
            error "無効なアクション: $ACTION"
            show_usage
            exit 1
            ;;
    esac
    
    log "✅ 処理が完了しました"
}

# スクリプト実行
main "$@"