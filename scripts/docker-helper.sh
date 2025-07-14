#!/bin/bash

# Docker Helper Script
set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# コマンド引数
COMMAND=$1
shift

case "$COMMAND" in
    "logs")
        # ログ表示
        SERVICE=${1:-}
        if [ -z "$SERVICE" ]; then
            docker-compose logs -f --tail=100
        else
            docker-compose logs -f --tail=100 "$SERVICE"
        fi
        ;;
        
    "restart")
        # サービス再起動
        SERVICE=${1:-}
        if [ -z "$SERVICE" ]; then
            echo -e "${YELLOW}全サービスを再起動します${NC}"
            docker-compose restart
        else
            echo -e "${YELLOW}${SERVICE}を再起動します${NC}"
            docker-compose restart "$SERVICE"
        fi
        ;;
        
    "shell")
        # コンテナに接続
        SERVICE=${1:-backend}
        echo -e "${GREEN}${SERVICE}コンテナに接続します${NC}"
        docker-compose exec "$SERVICE" sh
        ;;
        
    "db")
        # データベースに接続
        echo -e "${GREEN}PostgreSQLデータベースに接続します${NC}"
        docker-compose exec postgres psql -U postgres questboard
        ;;
        
    "redis-cli")
        # Redisに接続
        echo -e "${GREEN}Redis CLIに接続します${NC}"
        docker-compose exec redis redis-cli -a "${REDIS_PASSWORD:-redis123}"
        ;;
        
    "backup")
        # データベースバックアップ
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backups/questboard_backup_${TIMESTAMP}.sql.gz"
        echo -e "${GREEN}データベースをバックアップしています...${NC}"
        
        mkdir -p backups
        docker-compose exec -T postgres pg_dump -U postgres questboard | gzip > "$BACKUP_FILE"
        
        echo -e "${GREEN}バックアップ完了: $BACKUP_FILE${NC}"
        ls -lh "$BACKUP_FILE"
        ;;
        
    "restore")
        # データベースリストア
        BACKUP_FILE=$1
        if [ -z "$BACKUP_FILE" ]; then
            echo -e "${RED}使用方法: $0 restore <backup_file>${NC}"
            exit 1
        fi
        
        if [ ! -f "$BACKUP_FILE" ]; then
            echo -e "${RED}バックアップファイルが見つかりません: $BACKUP_FILE${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}警告: 既存のデータは削除されます。続行しますか? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${GREEN}データベースをリストアしています...${NC}"
            gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U postgres questboard
            echo -e "${GREEN}リストア完了${NC}"
        else
            echo "リストアをキャンセルしました"
        fi
        ;;
        
    "clean")
        # 未使用のリソースをクリーンアップ
        echo -e "${YELLOW}Dockerの未使用リソースをクリーンアップします${NC}"
        docker system prune -af --volumes
        ;;
        
    "stats")
        # リソース使用状況
        echo -e "${GREEN}コンテナのリソース使用状況:${NC}"
        docker stats --no-stream
        ;;
        
    "health")
        # ヘルスチェック状況
        echo -e "${GREEN}サービスのヘルス状態:${NC}"
        docker-compose ps
        echo ""
        echo -e "${GREEN}詳細なヘルスチェック:${NC}"
        
        # Backend API
        echo -n "Backend API: "
        if curl -sf http://localhost:3001/api/docs/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 正常${NC}"
        else
            echo -e "${RED}✗ 異常${NC}"
        fi
        
        # Frontend
        echo -n "Frontend: "
        if curl -sf http://localhost > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 正常${NC}"
        else
            echo -e "${RED}✗ 異常${NC}"
        fi
        
        # PostgreSQL
        echo -n "PostgreSQL: "
        if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 正常${NC}"
        else
            echo -e "${RED}✗ 異常${NC}"
        fi
        
        # Redis
        echo -n "Redis: "
        if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 正常${NC}"
        else
            echo -e "${RED}✗ 異常${NC}"
        fi
        
        # Elasticsearch
        echo -n "Elasticsearch: "
        if curl -sf http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 正常${NC}"
        else
            echo -e "${RED}✗ 異常${NC}"
        fi
        ;;
        
    "migrate")
        # マイグレーション実行
        echo -e "${GREEN}データベースマイグレーションを実行します${NC}"
        docker-compose exec backend npm run migrate
        ;;
        
    "seed")
        # シードデータ投入
        echo -e "${GREEN}シードデータを投入します${NC}"
        docker-compose exec backend npm run seed
        ;;
        
    "test")
        # テスト実行
        SERVICE=${1:-backend}
        echo -e "${GREEN}${SERVICE}のテストを実行します${NC}"
        if [ "$SERVICE" == "backend" ]; then
            docker-compose exec backend npm test
        else
            docker-compose exec frontend npm test
        fi
        ;;
        
    *)
        echo "Quest Board Docker Helper"
        echo ""
        echo "使用方法: $0 <command> [options]"
        echo ""
        echo "コマンド:"
        echo "  logs [service]     - ログを表示"
        echo "  restart [service]  - サービスを再起動"
        echo "  shell [service]    - コンテナのシェルに接続"
        echo "  db                 - PostgreSQLに接続"
        echo "  redis-cli          - Redis CLIに接続"
        echo "  backup             - データベースをバックアップ"
        echo "  restore <file>     - データベースをリストア"
        echo "  clean              - 未使用リソースをクリーンアップ"
        echo "  stats              - リソース使用状況を表示"
        echo "  health             - ヘルスチェック状況を表示"
        echo "  migrate            - マイグレーションを実行"
        echo "  seed               - シードデータを投入"
        echo "  test [service]     - テストを実行"
        echo ""
        echo "例:"
        echo "  $0 logs backend"
        echo "  $0 shell frontend"
        echo "  $0 backup"
        exit 1
        ;;
esac