#!/bin/bash

# バックアップcron設定スクリプト

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

# 現在のcrontab取得
get_current_crontab() {
    crontab -l 2>/dev/null || echo ""
}

# バックアップスケジュールの設定
setup_backup_schedule() {
    log "Setting up backup schedule..."
    
    # 現在のcrontabを取得
    local current_cron=$(get_current_crontab)
    
    # QuestBoardバックアップの削除（既存のものがあれば）
    current_cron=$(echo "$current_cron" | grep -v "questboard.*backup" || true)
    
    # 新しいスケジュールを追加
    local backup_script="/var/www/vhosts/QuestBoard/scripts/backup.sh"
    
    # デイリーバックアップ（毎日午前2時）
    current_cron="${current_cron}
# QuestBoard Daily Backup
0 2 * * * $backup_script full >> /var/log/questboard-backup.log 2>&1"
    
    # 増分バックアップ（6時間ごと）
    current_cron="${current_cron}
# QuestBoard Incremental Backup
0 */6 * * * $backup_script incremental >> /var/log/questboard-backup.log 2>&1"
    
    # バックアップステータスレポート（毎週月曜日午前9時）
    current_cron="${current_cron}
# QuestBoard Backup Status Report
0 9 * * 1 $backup_script status | mail -s 'QuestBoard Backup Status' admin@questboard.com"
    
    # 新しいcrontabを設定
    echo "$current_cron" | crontab -
    
    log "Backup schedule configured successfully"
}

# systemdタイマーの設定（代替案）
setup_systemd_timer() {
    log "Setting up systemd timer for backups..."
    
    # バックアップサービスユニット
    cat > /etc/systemd/system/questboard-backup.service << EOF
[Unit]
Description=QuestBoard Backup Service
After=network.target postgresql.service redis.service

[Service]
Type=oneshot
User=questboard
Group=questboard
WorkingDirectory=/var/www/vhosts/QuestBoard
ExecStart=/var/www/vhosts/QuestBoard/scripts/backup.sh full
StandardOutput=journal
StandardError=journal
EOF

    # バックアップタイマーユニット
    cat > /etc/systemd/system/questboard-backup.timer << EOF
[Unit]
Description=QuestBoard Daily Backup Timer
Requires=questboard-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # 増分バックアップサービス
    cat > /etc/systemd/system/questboard-backup-incremental.service << EOF
[Unit]
Description=QuestBoard Incremental Backup Service
After=network.target postgresql.service redis.service

[Service]
Type=oneshot
User=questboard
Group=questboard
WorkingDirectory=/var/www/vhosts/QuestBoard
ExecStart=/var/www/vhosts/QuestBoard/scripts/backup.sh incremental
StandardOutput=journal
StandardError=journal
EOF

    # 増分バックアップタイマー
    cat > /etc/systemd/system/questboard-backup-incremental.timer << EOF
[Unit]
Description=QuestBoard Incremental Backup Timer
Requires=questboard-backup-incremental.service

[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # systemdをリロード
    systemctl daemon-reload
    
    # タイマーを有効化
    systemctl enable questboard-backup.timer
    systemctl enable questboard-backup-incremental.timer
    
    # タイマーを開始
    systemctl start questboard-backup.timer
    systemctl start questboard-backup-incremental.timer
    
    log "Systemd timers configured successfully"
}

# バックアップスケジュールの表示
show_schedule() {
    echo ""
    log "Current backup schedule:"
    echo ""
    
    # Crontab
    echo "Crontab entries:"
    crontab -l 2>/dev/null | grep -E "questboard.*backup" || echo "  No crontab entries found"
    echo ""
    
    # Systemd timers
    if command -v systemctl &> /dev/null; then
        echo "Systemd timers:"
        systemctl list-timers | grep questboard-backup || echo "  No systemd timers found"
    fi
}

# バックアップスケジュールの削除
remove_schedule() {
    log "Removing backup schedule..."
    
    # Crontabから削除
    local current_cron=$(get_current_crontab)
    current_cron=$(echo "$current_cron" | grep -v "questboard.*backup" || true)
    echo "$current_cron" | crontab -
    
    # Systemdタイマーを無効化
    if command -v systemctl &> /dev/null; then
        systemctl stop questboard-backup.timer 2>/dev/null || true
        systemctl stop questboard-backup-incremental.timer 2>/dev/null || true
        systemctl disable questboard-backup.timer 2>/dev/null || true
        systemctl disable questboard-backup-incremental.timer 2>/dev/null || true
        rm -f /etc/systemd/system/questboard-backup*.{service,timer}
        systemctl daemon-reload
    fi
    
    log "Backup schedule removed"
}

# メイン処理
main() {
    local command=${1:-setup}
    
    case $command in
        setup)
            # OSに応じて適切な方法を選択
            if command -v systemctl &> /dev/null && [ -d /etc/systemd/system ]; then
                setup_systemd_timer
            else
                setup_backup_schedule
            fi
            show_schedule
            ;;
        show)
            show_schedule
            ;;
        remove)
            remove_schedule
            ;;
        *)
            echo "Usage: $0 [setup|show|remove]"
            echo ""
            echo "Commands:"
            echo "  setup   - Set up backup schedule"
            echo "  show    - Show current backup schedule"
            echo "  remove  - Remove backup schedule"
            exit 1
            ;;
    esac
}

# ルート権限チェック
if [ "$EUID" -ne 0 ] && [ "$1" = "setup" ]; then 
    warning "Note: Setting up systemd timers requires root privileges"
    warning "Running crontab setup instead..."
fi

# スクリプト実行
main "$@"