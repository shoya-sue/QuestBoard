---
title: デプロイメントガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, deployment, production]
---

# 🚀 QuestBoard デプロイメントガイド

## 📋 概要

このガイドでは、QuestBoard（冒険者クエスト掲示板）の包括的なデプロイメント手順を説明します。開発環境から本番環境まで、段階的なデプロイメント戦略を提供します。

## 🎯 デプロイメント環境

### 環境構成
```
Development   →   Staging   →   Production
    ↓              ↓              ↓
 Local Docker   AWS EKS Dev   AWS EKS Prod
    ↓              ↓              ↓
 開発・テスト     統合テスト     本番運用
```

### 各環境の特徴

| 環境 | 目的 | インフラ | データベース | 監視 |
|------|------|----------|-------------|------|
| **Development** | 開発・デバッグ | Docker Compose | PostgreSQL (Local) | Basic Logging |
| **Staging** | 統合テスト | EKS (Small) | RDS (Dev) | Prometheus + Grafana |
| **Production** | 本番運用 | EKS (HA) | RDS (Multi-AZ) | Full Monitoring |

## 📦 前提条件

### 必須ツール
```bash
# 基本ツール
node --version          # v18.0.0+
npm --version          # v9.0.0+
git --version          # v2.40.0+

# コンテナ・オーケストレーション
docker --version       # v24.0.0+
docker-compose --version # v2.20.0+
kubectl version        # v1.28.0+

# クラウド・インフラ
aws --version          # v2.13.0+
terraform --version    # v1.5.0+
helm version           # v3.12.0+
```

### AWS権限設定
```bash
# AWS CLI設定
aws configure

# 必要なIAMポリシー
- AmazonEKSClusterPolicy
- AmazonEKSWorkerNodePolicy
- AmazonEKS_CNI_Policy
- AmazonEC2ContainerRegistryReadOnly
- AmazonRDSFullAccess
- AmazonElastiCacheFullAccess
- AmazonS3FullAccess
```

## 🐳 開発環境デプロイ

### 1. Docker Compose セットアップ
```bash
# プロジェクトクローン
git clone https://github.com/shoya-sue/QuestBoard.git
cd QuestBoard

# 環境変数設定
cp .env.example .env.local

# 環境変数編集
nano .env.local
```

### 2. 環境変数設定
```bash
# .env.local
NODE_ENV=development
PORT=3001
FRONTEND_PORT=3000

# データベース
DB_HOST=postgres
DB_PORT=5432
DB_NAME=questboard_dev
DB_USER=questboard
DB_PASSWORD=questboard_dev_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# 認証
JWT_SECRET=your-development-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 管理者
ADMIN_EMAILS=admin@example.com

# 監視
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### 3. Docker Compose 起動
```bash
# 開発環境起動
docker-compose -f docker-compose.yml up -d

# ログ確認
docker-compose logs -f

# サービス状態確認
docker-compose ps
```

### 4. 初期データセットアップ
```bash
# データベース初期化
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# 管理者ユーザー作成
docker-compose exec backend npm run create-admin
```

### 5. 動作確認
```bash
# フロントエンド: http://localhost:3000
curl http://localhost:3000

# API: http://localhost:3001
curl http://localhost:3001/api/health

# Grafana: http://localhost:3001/grafana
# Prometheus: http://localhost:9090
```

## ☸️ Kubernetes デプロイメント

### 1. EKS クラスター作成
```bash
# Terraform でインフラ構築
cd terraform
terraform init
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"

# kubectl 設定
aws eks update-kubeconfig --name questboard-cluster --region ap-northeast-1
```

### 2. 前提条件確認
```bash
# クラスター状態確認
kubectl get nodes
kubectl get namespaces

# Ingress Controller インストール
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/aws/deploy.yaml
```

### 3. シークレット設定
```bash
# データベース認証情報
kubectl create secret generic db-credentials \
  --from-literal=username=questboard \
  --from-literal=password=secure-production-password \
  --from-literal=host=questboard-db.cluster-xxx.ap-northeast-1.rds.amazonaws.com

# JWT シークレット
kubectl create secret generic jwt-secret \
  --from-literal=secret=your-super-secure-jwt-secret

# Google OAuth
kubectl create secret generic google-oauth \
  --from-literal=client-id=your-google-client-id \
  --from-literal=client-secret=your-google-client-secret
```

### 4. ConfigMap 設定
```bash
# アプリケーション設定
kubectl apply -f k8s/configmap.yaml

# 確認
kubectl get configmaps
kubectl describe configmap app-config
```

### 5. データベース・Redis デプロイ
```bash
# PostgreSQL デプロイ
kubectl apply -f k8s/postgres.yaml

# Redis デプロイ
kubectl apply -f k8s/redis.yaml

# 状態確認
kubectl get pods -l app=postgres
kubectl get pods -l app=redis
```

### 6. アプリケーション デプロイ
```bash
# バックエンド デプロイ
kubectl apply -f k8s/backend.yaml

# フロントエンド デプロイ
kubectl apply -f k8s/frontend.yaml

# Ingress 設定
kubectl apply -f k8s/ingress.yaml

# 状態確認
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get ingress
```

### 7. 監視・ログ設定
```bash
# Prometheus・Grafana デプロイ
kubectl apply -f k8s/monitoring.yaml

# 監視ダッシュボード確認
kubectl port-forward svc/grafana 3001:80
# http://localhost:3001 でアクセス
```

## 🔄 CI/CD パイプライン設定

### 1. GitHub Actions セットアップ
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name questboard-cluster
          ./scripts/k8s-deploy.sh
```

### 2. GitHub Secrets 設定
```bash
# 必要なシークレット
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
KUBECONFIG_DATA=base64-encoded-kubeconfig
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DB_PASSWORD=your-database-password
```

### 3. 自動デプロイ スクリプト
```bash
#!/bin/bash
# scripts/k8s-deploy.sh

set -euo pipefail

echo "🚀 Starting deployment to Kubernetes..."

# 前提条件確認
kubectl cluster-info
kubectl get nodes

# イメージビルド・プッシュ
docker build -t questboard-backend:latest -f Dockerfile.backend .
docker build -t questboard-frontend:latest -f Dockerfile.frontend .

# ECR プッシュ
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag questboard-backend:latest $ECR_REGISTRY/questboard-backend:latest
docker tag questboard-frontend:latest $ECR_REGISTRY/questboard-frontend:latest
docker push $ECR_REGISTRY/questboard-backend:latest
docker push $ECR_REGISTRY/questboard-frontend:latest

# Kubernetes デプロイ
kubectl apply -f k8s/
kubectl rollout status deployment/backend --timeout=600s
kubectl rollout status deployment/frontend --timeout=600s

# ヘルスチェック
./scripts/health-check.sh

echo "✅ Deployment completed successfully!"
```

## 📊 監視・ログ設定

### 1. Prometheus 設定
```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'questboard-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
  
  - job_name: 'questboard-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
  
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 2. Grafana ダッシュボード
```bash
# Grafana 起動
kubectl port-forward svc/grafana 3001:80

# 初期設定
Username: admin
Password: admin

# データソース追加
URL: http://prometheus:9090
Access: Server (default)
```

### 3. アラート設定
```yaml
# monitoring/alertmanager/config.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@questboard.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@questboard.com'
        subject: 'QuestBoard Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

## 🔒 セキュリティ設定

### 1. TLS/SSL 証明書
```bash
# cert-manager インストール
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Let's Encrypt 設定
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@questboard.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policy
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: questboard-network-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### 3. Pod Security Policy
```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: questboard-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 🔧 運用・保守

### 1. バックアップ設定
```bash
# 自動バックアップ設定
kubectl create cronjob database-backup \
  --image=questboard-backup:latest \
  --schedule="0 2 * * *" \
  --restart=OnFailure \
  -- /scripts/backup.sh

# バックアップ確認
kubectl get cronjobs
kubectl get jobs
```

### 2. スケーリング設定
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 3. ログ収集
```bash
# Fluentd セットアップ
kubectl apply -f k8s/logging.yaml

# ログ確認
kubectl logs -f deployment/backend
kubectl logs -f deployment/frontend

# 集約ログ確認
kubectl port-forward svc/kibana 5601:5601
# http://localhost:5601 でアクセス
```

### 4. ヘルスチェック
```bash
#!/bin/bash
# scripts/health-check.sh

echo "🔍 Performing health checks..."

# Kubernetes クラスター
kubectl get nodes --no-headers | wc -l
kubectl get pods --all-namespaces | grep -v Running | wc -l

# アプリケーション
BACKEND_URL="https://api.questboard.com"
FRONTEND_URL="https://questboard.com"

# API ヘルスチェック
if curl -sf "$BACKEND_URL/health" > /dev/null; then
  echo "✅ Backend API is healthy"
else
  echo "❌ Backend API is unhealthy"
  exit 1
fi

# フロントエンド ヘルスチェック
if curl -sf "$FRONTEND_URL" > /dev/null; then
  echo "✅ Frontend is healthy"
else
  echo "❌ Frontend is unhealthy"
  exit 1
fi

# データベース接続
kubectl exec deployment/backend -- npm run db:health

echo "🎉 All health checks passed!"
```

## 🚧 トラブルシューティング

### 1. よくある問題と解決策

#### Pod が起動しない
```bash
# Pod 状態確認
kubectl get pods -o wide
kubectl describe pod <pod-name>

# ログ確認
kubectl logs <pod-name>
kubectl logs <pod-name> --previous

# リソース確認
kubectl top nodes
kubectl top pods
```

#### イメージプル エラー
```bash
# イメージプル シークレット確認
kubectl get secrets
kubectl describe secret regcred

# ECR ログイン確認
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <ecr-url>
```

#### ネットワーク接続問題
```bash
# サービス確認
kubectl get svc
kubectl describe svc <service-name>

# Ingress 確認
kubectl get ingress
kubectl describe ingress <ingress-name>

# DNS 確認
kubectl run debug --image=busybox --rm -it -- nslookup <service-name>
```

### 2. 緊急時対応

#### ロールバック手順
```bash
# 直前のデプロイをロールバック
kubectl rollout undo deployment/backend
kubectl rollout undo deployment/frontend

# 特定のリビジョンにロールバック
kubectl rollout history deployment/backend
kubectl rollout undo deployment/backend --to-revision=3
```

#### 緊急スケールアップ
```bash
# 手動スケーリング
kubectl scale deployment backend --replicas=10
kubectl scale deployment frontend --replicas=5

# 確認
kubectl get pods -l app=backend
kubectl get pods -l app=frontend
```

### 3. パフォーマンス最適化

#### リソース使用量確認
```bash
# CPU・メモリ使用量
kubectl top pods --sort-by=cpu
kubectl top pods --sort-by=memory

# ボトルネック分析
kubectl exec -it <pod-name> -- ps aux
kubectl exec -it <pod-name> -- free -h
```

## 📋 チェックリスト

### デプロイ前確認
- [ ] 依存関係の更新確認
- [ ] セキュリティスキャン実行
- [ ] テストスイート実行
- [ ] 環境変数設定確認
- [ ] データベースマイグレーション確認

### デプロイ後確認
- [ ] Pod 起動状態確認
- [ ] ヘルスチェック実行
- [ ] ログ確認
- [ ] 監視ダッシュボード確認
- [ ] パフォーマンステスト実行

### 運用開始前確認
- [ ] バックアップ動作確認
- [ ] アラート設定確認
- [ ] スケーリング動作確認
- [ ] セキュリティ設定確認
- [ ] 災害復旧手順確認

---

**文書管理**
- 作成日: 2024年7月14日
- 最終更新: 2024年7月14日
- 次回レビュー: 2024年8月14日
- 承認者: DevOps Team