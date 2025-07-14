# Quest Board バックアップガイド

## 概要

Quest Boardのバックアップシステムは、データの安全性と可用性を確保するための包括的なソリューションです。

## バックアップ戦略

### 1. バックアップタイプ

#### フルバックアップ
- **頻度**: 毎日午前2時
- **内容**: 
  - PostgreSQLデータベース全体
  - アプリケーションファイル
  - Redisデータ
  - 設定ファイル
- **保持期間**:
  - デイリー: 7日間
  - ウィークリー: 30日間  
  - マンスリー: 365日間

#### 増分バックアップ
- **頻度**: 6時間ごと
- **内容**: 前回のバックアップ以降の変更分のみ
- **保持期間**: 24時間

### 2. バックアップストレージ

#### ローカルストレージ
```
/var/backups/questboard/
├── daily/
├── weekly/
├── monthly/
├── temp/
└── logs/
```

#### S3ストレージ
- **バケット**: `questboard-backups`
- **構造**: `{hostname}/{type}/{filename}`
- **ストレージクラス**: STANDARD_IA
- **暗号化**: AES256

## セットアップ

### 1. 環境変数の設定

`.env`ファイルに以下を追加:

```bash
# バックアップ設定
BACKUP_ENABLED=true
BACKUP_DIR=/var/backups/questboard
BACKUP_S3_BUCKET=questboard-backups
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your-encryption-key

# AWS設定
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### 2. バックアップスケジュールの設定

```bash
# バックアップスケジュールを設定
./scripts/backup-cron.sh setup

# スケジュールを確認
./scripts/backup-cron.sh show
```

### 3. 初回バックアップの実行

```bash
# フルバックアップを実行
./scripts/backup.sh full

# バックアップステータスを確認
./scripts/backup.sh status
```

## 手動バックアップ

### フルバックアップ
```bash
./scripts/backup.sh full
```

### 増分バックアップ
```bash
./scripts/backup.sh incremental
```

### バックアップステータス確認
```bash
./scripts/backup.sh status
```

## リストア手順

### 1. 利用可能なバックアップの確認

```bash
# バックアップリストを表示
./scripts/backup.sh restore

# または管理APIを使用
curl -H "Authorization: Bearer $TOKEN" \
  https://api.questboard.com/api/admin/backup/status
```

### 2. バックアップからの復元

#### ローカルバックアップから
```bash
./scripts/backup.sh restore /var/backups/questboard/daily/questboard_full_20240101_020000.tar.gz
```

#### S3バックアップから
```bash
./scripts/backup.sh restore s3://questboard-backups/prod-server/daily/questboard_full_20240101_020000.tar.gz
```

### 3. 復元後の確認

1. データベース接続の確認
2. アプリケーションの起動確認
3. データ整合性の検証

## 管理API

### バックアップの作成
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}' \
  https://api.questboard.com/api/admin/backup
```

### バックアップステータスの確認
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.questboard.com/api/admin/backup/status
```

### ダウンロードURLの生成
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupPath": "s3://questboard-backups/prod/daily/backup.tar.gz"}' \
  https://api.questboard.com/api/admin/backup/download-url
```

## 災害復旧計画

### RTO (Recovery Time Objective)
- 目標復旧時間: 1時間以内

### RPO (Recovery Point Objective)
- 目標復旧時点: 最大6時間前

### 復旧手順

1. **インフラの準備**
   ```bash
   # 新しいサーバーのプロビジョニング
   terraform apply -var="disaster_recovery=true"
   ```

2. **最新バックアップの取得**
   ```bash
   # S3から最新のフルバックアップをダウンロード
   aws s3 cp s3://questboard-backups/prod/daily/latest.tar.gz ./
   ```

3. **システムの復元**
   ```bash
   # Dockerコンテナの起動
   docker-compose up -d postgres redis elasticsearch
   
   # バックアップからの復元
   ./scripts/backup.sh restore latest.tar.gz
   
   # アプリケーションの起動
   docker-compose up -d
   ```

4. **動作確認**
   ```bash
   # ヘルスチェック
   ./scripts/health-check.sh production
   ```

## ベストプラクティス

### 1. 定期的なテスト
- 月1回の復元テストを実施
- 異なる環境での復元確認

### 2. 監視とアラート
- バックアップ失敗時のアラート設定
- ストレージ容量の監視

### 3. セキュリティ
- バックアップの暗号化
- アクセス権限の最小化
- 監査ログの有効化

### 4. ドキュメンテーション
- 復旧手順の文書化
- 連絡先リストの管理
- 変更履歴の記録

## トラブルシューティング

### バックアップが失敗する
```bash
# ログを確認
tail -f /var/backups/questboard/logs/backup_*.log

# 権限を確認
ls -la /var/backups/questboard/

# ディスク容量を確認
df -h
```

### S3アップロードが失敗する
```bash
# AWS認証情報を確認
aws s3 ls s3://questboard-backups/

# ネットワーク接続を確認
curl -I https://s3.amazonaws.com/
```

### 復元が失敗する
```bash
# バックアップファイルの整合性を確認
tar -tzf backup.tar.gz | head

# データベース接続を確認
psql -h localhost -U questboard -d questboard -c "SELECT 1"
```

## 監視メトリクス

Prometheusで以下のメトリクスを監視:

- `backup_last_success_timestamp`: 最後の成功したバックアップのタイムスタンプ
- `backup_duration_seconds`: バックアップ所要時間
- `backup_size_bytes`: バックアップサイズ
- `backup_failure_total`: バックアップ失敗回数

## 関連ドキュメント

- [セキュリティガイド](./SECURITY.md)
- [監視ガイド](./MONITORING.md)
- [運用ガイド](./OPERATIONS.md)