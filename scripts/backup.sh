#!/bin/bash

# Quest Board バックアップスクリプト
# 使用方法: ./backup.sh [full|incremental|restore]

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 設定
BACKUP_DIR="${BACKUP_DIR:-/var/backups/questboard}"
S3_BUCKET="${BACKUP_S3_BUCKET:-questboard-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

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

# 環境変数の読み込み
load_env() {
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        error ".env file not found"
    fi
}

# ディレクトリ作成
create_directories() {
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,temp}
    mkdir -p "$BACKUP_DIR"/logs
}

# データベースバックアップ
backup_database() {
    local backup_type=$1
    local db_backup_file="$BACKUP_DIR/temp/db_${backup_type}_${TIMESTAMP}.sql.gz"
    
    log "Starting database backup (${backup_type})..."
    
    # PostgreSQLバックアップ
    if [ "$backup_type" = "full" ]; then
        # フルバックアップ
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --clean \
            --create \
            --if-exists \
            --no-owner \
            --no-privileges \
            | gzip -9 > "$db_backup_file"
    else
        # 増分バックアップ（変更されたテーブルのみ）
        # 実際の実装では pg_basebackup や WAL アーカイブを使用
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --data-only \
            --exclude-table=logs \
            --exclude-table=sessions \
            | gzip -9 > "$db_backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: $(du -h "$db_backup_file" | cut -f1)"
        echo "$db_backup_file"
    else
        error "Database backup failed"
    fi
}

# ファイルバックアップ
backup_files() {
    local backup_type=$1
    local files_backup_file="$BACKUP_DIR/temp/files_${backup_type}_${TIMESTAMP}.tar.gz"
    
    log "Starting files backup (${backup_type})..."
    
    # バックアップ対象ディレクトリ
    local include_dirs=(
        "backend/src"
        "backend/config"
        "backend/migrations"
        "frontend/src"
        "frontend/public"
        "scripts"
        "docker-compose*.yml"
        "Dockerfile*"
        ".github"
    )
    
    # 除外パターン
    local exclude_patterns=(
        "node_modules"
        "*.log"
        "*.tmp"
        ".git"
        "coverage"
        "dist"
        "build"
    )
    
    # tar コマンドの構築
    local tar_cmd="tar -czf $files_backup_file"
    
    # 除外パターンを追加
    for pattern in "${exclude_patterns[@]}"; do
        tar_cmd="$tar_cmd --exclude='$pattern'"
    done
    
    # インクルードディレクトリを追加
    tar_cmd="$tar_cmd ${include_dirs[*]}"
    
    # バックアップ実行
    eval $tar_cmd 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Files backup completed: $(du -h "$files_backup_file" | cut -f1)"
        echo "$files_backup_file"
    else
        warning "Some files could not be backed up"
        echo "$files_backup_file"
    fi
}

# Redisバックアップ
backup_redis() {
    local redis_backup_file="$BACKUP_DIR/temp/redis_${TIMESTAMP}.rdb"
    
    log "Starting Redis backup..."
    
    # Redis BGSAVE実行
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    
    # バックアップ完了を待つ
    while [ $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE) -eq $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE) ]; do
        sleep 1
    done
    
    # RDBファイルをコピー
    scp "$REDIS_HOST:/var/lib/redis/dump.rdb" "$redis_backup_file" 2>/dev/null || \
    docker cp redis:/data/dump.rdb "$redis_backup_file" 2>/dev/null || \
    cp /var/lib/redis/dump.rdb "$redis_backup_file" 2>/dev/null
    
    if [ -f "$redis_backup_file" ]; then
        gzip -9 "$redis_backup_file"
        log "Redis backup completed"
        echo "${redis_backup_file}.gz"
    else
        warning "Redis backup skipped (could not access RDB file)"
    fi
}

# バックアップの暗号化
encrypt_backup() {
    local backup_file=$1
    local encrypted_file="${backup_file}.enc"
    
    log "Encrypting backup..."
    
    openssl enc -aes-256-cbc \
        -salt \
        -in "$backup_file" \
        -out "$encrypted_file" \
        -k "${BACKUP_ENCRYPTION_KEY:-$DB_PASSWORD}" \
        -pbkdf2
    
    if [ $? -eq 0 ]; then
        rm -f "$backup_file"
        log "Backup encrypted"
        echo "$encrypted_file"
    else
        error "Encryption failed"
    fi
}

# S3へのアップロード
upload_to_s3() {
    local file=$1
    local backup_type=$2
    local s3_path="s3://$S3_BUCKET/$HOSTNAME/$backup_type/$(basename "$file")"
    
    log "Uploading to S3: $s3_path"
    
    aws s3 cp "$file" "$s3_path" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "timestamp=$TIMESTAMP,hostname=$HOSTNAME,type=$backup_type"
    
    if [ $? -eq 0 ]; then
        log "Upload completed"
        return 0
    else
        error "S3 upload failed"
    fi
}

# バックアップの整理
rotate_backups() {
    local backup_type=$1
    
    log "Rotating ${backup_type} backups..."
    
    # ローカルバックアップの整理
    case $backup_type in
        daily)
            find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +7 -delete
            ;;
        weekly)
            find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +30 -delete
            ;;
        monthly)
            find "$BACKUP_DIR/monthly" -name "*.tar.gz" -mtime +365 -delete
            ;;
    esac
    
    # S3バックアップの整理
    if [ -n "$S3_BUCKET" ]; then
        aws s3 ls "s3://$S3_BUCKET/$HOSTNAME/$backup_type/" | \
        while read -r line; do
            create_date=$(echo "$line" | awk '{print $1" "$2}')
            create_ts=$(date -d "$create_date" +%s)
            current_ts=$(date +%s)
            age_days=$(( (current_ts - create_ts) / 86400 ))
            
            if [ $age_days -gt $RETENTION_DAYS ]; then
                file=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://$S3_BUCKET/$HOSTNAME/$backup_type/$file"
                log "Deleted old backup: $file"
            fi
        done
    fi
}

# フルバックアップ
full_backup() {
    log "Starting full backup..."
    
    local backup_files=()
    
    # データベースバックアップ
    db_backup=$(backup_database "full")
    backup_files+=("$db_backup")
    
    # ファイルバックアップ
    files_backup=$(backup_files "full")
    backup_files+=("$files_backup")
    
    # Redisバックアップ
    redis_backup=$(backup_redis)
    if [ -n "$redis_backup" ]; then
        backup_files+=("$redis_backup")
    fi
    
    # 全てのバックアップを1つのアーカイブに
    local full_backup_file="$BACKUP_DIR/temp/questboard_full_${TIMESTAMP}.tar"
    tar -cf "$full_backup_file" -C "$BACKUP_DIR/temp" \
        $(for f in "${backup_files[@]}"; do basename "$f"; done)
    
    # 圧縮
    gzip -9 "$full_backup_file"
    full_backup_file="${full_backup_file}.gz"
    
    # 暗号化（オプション）
    if [ "${BACKUP_ENCRYPTION:-false}" = "true" ]; then
        full_backup_file=$(encrypt_backup "$full_backup_file")
    fi
    
    # 適切なディレクトリに移動
    local dest_dir="$BACKUP_DIR/daily"
    if [ $(date +%u) -eq 7 ]; then
        dest_dir="$BACKUP_DIR/weekly"
    fi
    if [ $(date +%d) -eq 1 ]; then
        dest_dir="$BACKUP_DIR/monthly"
    fi
    
    mv "$full_backup_file" "$dest_dir/"
    
    # S3へアップロード
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$dest_dir/$(basename "$full_backup_file")" "$(basename "$dest_dir")"
    fi
    
    # 一時ファイルの削除
    rm -f "$BACKUP_DIR/temp/"*
    
    # バックアップローテーション
    rotate_backups "daily"
    rotate_backups "weekly"
    rotate_backups "monthly"
    
    log "Full backup completed successfully"
}

# 増分バックアップ
incremental_backup() {
    log "Starting incremental backup..."
    
    # データベースの増分バックアップ
    db_backup=$(backup_database "incremental")
    
    # S3へ直接アップロード
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$db_backup" "incremental"
    fi
    
    # ローカルコピーを保持
    mv "$db_backup" "$BACKUP_DIR/daily/"
    
    log "Incremental backup completed"
}

# バックアップからの復元
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        # 利用可能なバックアップをリスト
        log "Available backups:"
        echo ""
        
        # ローカルバックアップ
        find "$BACKUP_DIR" -name "*.tar.gz*" -type f | sort -r | head -20
        
        # S3バックアップ
        if [ -n "$S3_BUCKET" ]; then
            echo ""
            log "S3 backups:"
            aws s3 ls "s3://$S3_BUCKET/$HOSTNAME/" --recursive | sort -r | head -20
        fi
        
        echo ""
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    log "Restoring from: $backup_file"
    
    # 確認プロンプト
    echo -e "${YELLOW}WARNING: This will overwrite current data!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    # 一時ディレクトリに展開
    local temp_restore="$BACKUP_DIR/temp/restore_${TIMESTAMP}"
    mkdir -p "$temp_restore"
    
    # S3からダウンロード（必要な場合）
    if [[ "$backup_file" == s3://* ]]; then
        local local_file="$temp_restore/$(basename "$backup_file")"
        aws s3 cp "$backup_file" "$local_file"
        backup_file="$local_file"
    fi
    
    # 復号化（必要な場合）
    if [[ "$backup_file" == *.enc ]]; then
        local decrypted_file="${backup_file%.enc}"
        openssl enc -aes-256-cbc -d \
            -in "$backup_file" \
            -out "$decrypted_file" \
            -k "${BACKUP_ENCRYPTION_KEY:-$DB_PASSWORD}" \
            -pbkdf2
        backup_file="$decrypted_file"
    fi
    
    # アーカイブの展開
    tar -xzf "$backup_file" -C "$temp_restore"
    
    # データベースの復元
    local db_backup=$(find "$temp_restore" -name "db_*.sql.gz" | head -1)
    if [ -n "$db_backup" ]; then
        log "Restoring database..."
        gunzip < "$db_backup" | PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d postgres
    fi
    
    # ファイルの復元
    local files_backup=$(find "$temp_restore" -name "files_*.tar.gz" | head -1)
    if [ -n "$files_backup" ]; then
        log "Restoring files..."
        tar -xzf "$files_backup" -C /
    fi
    
    # Redisの復元
    local redis_backup=$(find "$temp_restore" -name "redis_*.rdb.gz" | head -1)
    if [ -n "$redis_backup" ]; then
        log "Restoring Redis..."
        gunzip < "$redis_backup" > "$temp_restore/dump.rdb"
        # Redisを停止してRDBファイルを置き換え
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" SHUTDOWN
        cp "$temp_restore/dump.rdb" /var/lib/redis/dump.rdb
        # Redisを再起動
        systemctl start redis || docker-compose up -d redis
    fi
    
    # 一時ファイルの削除
    rm -rf "$temp_restore"
    
    log "Restore completed successfully"
}

# バックアップステータス
backup_status() {
    log "Backup Status Report"
    echo ""
    
    # ディスク使用量
    echo "Disk Usage:"
    du -sh "$BACKUP_DIR"/* 2>/dev/null | sort -h
    echo ""
    
    # 最新のバックアップ
    echo "Latest Backups:"
    find "$BACKUP_DIR" -name "*.tar.gz*" -type f -exec ls -lh {} \; | sort -k6,7 -r | head -10
    echo ""
    
    # S3ストレージ
    if [ -n "$S3_BUCKET" ]; then
        echo "S3 Storage:"
        aws s3 ls "s3://$S3_BUCKET/$HOSTNAME/" --recursive --summarize --human-readable | tail -2
    fi
    
    # 次回のバックアップスケジュール
    if crontab -l 2>/dev/null | grep -q backup.sh; then
        echo ""
        echo "Scheduled Backups:"
        crontab -l | grep backup.sh
    fi
}

# メイン処理
main() {
    local command=${1:-full}
    
    load_env
    create_directories
    
    # ログファイル設定
    exec 1> >(tee -a "$BACKUP_DIR/logs/backup_${TIMESTAMP}.log")
    exec 2>&1
    
    case $command in
        full)
            full_backup
            ;;
        incremental)
            incremental_backup
            ;;
        restore)
            restore_backup "$2"
            ;;
        status)
            backup_status
            ;;
        *)
            echo "Usage: $0 [full|incremental|restore|status]"
            exit 1
            ;;
    esac
    
    # 古いログファイルの削除
    find "$BACKUP_DIR/logs" -name "*.log" -mtime +30 -delete
}

# スクリプト実行
main "$@"