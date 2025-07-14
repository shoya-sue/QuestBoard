#!/bin/bash

# Blue/Green デプロイメントスクリプト
set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 環境変数
ENVIRONMENT=${1:-staging}
CLUSTER_NAME="questboard-${ENVIRONMENT}"
SERVICE_NAME="questboard-app"
TARGET_GROUP_BLUE_ARN=${TARGET_GROUP_BLUE_ARN}
TARGET_GROUP_GREEN_ARN=${TARGET_GROUP_GREEN_ARN}
ALB_LISTENER_ARN=${ALB_LISTENER_ARN}

# ログ関数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 現在のアクティブな環境を確認
get_active_target_group() {
    aws elbv2 describe-rules \
        --listener-arn $ALB_LISTENER_ARN \
        --query "Rules[?Priority=='1'].Actions[0].TargetGroupArn" \
        --output text
}

# タスク定義の更新
update_task_definition() {
    local color=$1
    local image_tag=$2
    
    log "タスク定義を更新しています (${color})..."
    
    # 現在のタスク定義を取得
    TASK_DEFINITION=$(aws ecs describe-task-definition \
        --task-definition questboard-${color} \
        --query 'taskDefinition' \
        --output json)
    
    # イメージタグを更新
    NEW_TASK_DEF=$(echo $TASK_DEFINITION | \
        jq --arg IMAGE_TAG "$image_tag" \
        '.containerDefinitions[0].image = "ghcr.io/'"$GITHUB_REPOSITORY"'-backend:" + $IMAGE_TAG')
    
    # 新しいタスク定義を登録
    aws ecs register-task-definition \
        --cli-input-json "$NEW_TASK_DEF" > /dev/null
    
    log "タスク定義の更新完了"
}

# サービスの更新
update_service() {
    local color=$1
    local task_definition=$2
    
    log "${color}環境のサービスを更新しています..."
    
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service questboard-${color} \
        --task-definition $task_definition \
        --force-new-deployment \
        --desired-count 2
    
    # デプロイメントの完了を待つ
    log "デプロイメントの完了を待っています..."
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services questboard-${color}
    
    log "${color}環境のデプロイメント完了"
}

# ヘルスチェック
health_check() {
    local target_group_arn=$1
    local max_attempts=30
    local attempt=1
    
    log "ヘルスチェックを実行しています..."
    
    while [ $attempt -le $max_attempts ]; do
        HEALTHY_COUNT=$(aws elbv2 describe-target-health \
            --target-group-arn $target_group_arn \
            --query "TargetHealthDescriptions[?TargetHealth.State=='healthy'] | length(@)" \
            --output text)
        
        if [ "$HEALTHY_COUNT" -ge 2 ]; then
            log "✓ ヘルスチェック成功 (Healthy: $HEALTHY_COUNT)"
            return 0
        fi
        
        echo -n "."
        sleep 10
        ((attempt++))
    done
    
    error "ヘルスチェックがタイムアウトしました"
}

# トラフィックの切り替え
switch_traffic() {
    local new_target_group_arn=$1
    
    log "トラフィックを切り替えています..."
    
    aws elbv2 modify-rule \
        --rule-arn $(aws elbv2 describe-rules \
            --listener-arn $ALB_LISTENER_ARN \
            --query "Rules[?Priority=='1'].RuleArn" \
            --output text) \
        --actions Type=forward,TargetGroupArn=$new_target_group_arn
    
    log "トラフィックの切り替え完了"
}

# メイン処理
main() {
    log "Blue/Green デプロイメントを開始します (環境: $ENVIRONMENT)"
    
    # 現在のアクティブな環境を確認
    CURRENT_TARGET_GROUP=$(get_active_target_group)
    
    if [ "$CURRENT_TARGET_GROUP" == "$TARGET_GROUP_BLUE_ARN" ]; then
        info "現在のアクティブ環境: BLUE"
        ACTIVE_COLOR="blue"
        INACTIVE_COLOR="green"
        NEW_TARGET_GROUP=$TARGET_GROUP_GREEN_ARN
    else
        info "現在のアクティブ環境: GREEN"
        ACTIVE_COLOR="green"
        INACTIVE_COLOR="blue"
        NEW_TARGET_GROUP=$TARGET_GROUP_BLUE_ARN
    fi
    
    # 新しいイメージタグを取得
    IMAGE_TAG=${GITHUB_SHA:-latest}
    
    # 非アクティブ環境を更新
    update_task_definition $INACTIVE_COLOR $IMAGE_TAG
    update_service $INACTIVE_COLOR "questboard-${INACTIVE_COLOR}"
    
    # ヘルスチェック
    health_check $NEW_TARGET_GROUP
    
    # カナリアデプロイ（10%のトラフィックを新環境へ）
    if [ "$ENVIRONMENT" == "production" ]; then
        log "カナリアデプロイを実行しています..."
        
        aws elbv2 modify-rule \
            --rule-arn $(aws elbv2 describe-rules \
                --listener-arn $ALB_LISTENER_ARN \
                --query "Rules[?Priority=='1'].RuleArn" \
                --output text) \
            --actions Type=forward,ForwardConfig="{TargetGroups=[{TargetGroupArn=$CURRENT_TARGET_GROUP,Weight=90},{TargetGroupArn=$NEW_TARGET_GROUP,Weight=10}]}"
        
        log "10%のトラフィックを新環境に転送しています"
        sleep 300  # 5分間監視
        
        # メトリクスの確認
        ERROR_RATE=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/ApplicationELB \
            --metric-name TargetResponseTime \
            --dimensions Name=TargetGroup,Value=${NEW_TARGET_GROUP##*/} \
            --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 300 \
            --statistics Average \
            --query 'Datapoints[0].Average' \
            --output text)
        
        if (( $(echo "$ERROR_RATE > 1000" | bc -l) )); then
            error "レスポンスタイムが閾値を超えています。ロールバックします。"
        fi
    fi
    
    # 完全切り替え
    switch_traffic $NEW_TARGET_GROUP
    
    # 古い環境のスケールダウン（5分後）
    log "5分後に古い環境をスケールダウンします"
    (
        sleep 300
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service questboard-${ACTIVE_COLOR} \
            --desired-count 0
        log "古い環境（${ACTIVE_COLOR}）をスケールダウンしました"
    ) &
    
    log "✅ Blue/Green デプロイメントが完了しました"
    info "新しいアクティブ環境: ${INACTIVE_COLOR^^}"
}

# スクリプト実行
main