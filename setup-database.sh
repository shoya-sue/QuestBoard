#!/bin/bash

echo "🗄️  PostgreSQL セットアップ"
echo "=========================="
echo ""

# PostgreSQLがインストールされているか確認
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQLがインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "  Mac: brew install postgresql"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql"
    echo "  CentOS/RHEL: sudo yum install postgresql-server"
    exit 1
fi

echo "✅ PostgreSQLが見つかりました"

# 現在の設定を読み取る
DB_NAME="questboard"
DB_USER="postgres"
DB_PASSWORD="postgres"

if [ -f "backend/.env" ]; then
    # .envファイルから設定を読み取る
    DB_NAME=$(grep "^DB_NAME=" backend/.env | cut -d'=' -f2) || DB_NAME="questboard"
    DB_USER=$(grep "^DB_USER=" backend/.env | cut -d'=' -f2) || DB_USER="postgres"
    DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env | cut -d'=' -f2) || DB_PASSWORD="postgres"
fi

echo ""
echo "データベース設定:"
echo "  データベース名: $DB_NAME"
echo "  ユーザー名: $DB_USER"
echo ""

# PostgreSQLサービスが起動しているか確認
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQLサービスが起動していません"
    echo ""
    echo "起動方法:"
    echo "  Mac: brew services start postgresql"
    echo "  Linux: sudo service postgresql start"
    echo ""
    read -p "PostgreSQLを起動してから Enter を押してください..."
fi

# データベースが存在するか確認
if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ データベース '$DB_NAME' は既に存在します"
else
    echo "📝 データベース '$DB_NAME' を作成します..."
    
    # データベースを作成
    if createdb -U $DB_USER $DB_NAME 2>/dev/null; then
        echo "✅ データベースを作成しました"
    else
        echo "❌ データベースの作成に失敗しました"
        echo ""
        echo "手動で作成する場合:"
        echo "  sudo -u postgres createdb $DB_NAME"
        echo "  または"
        echo "  psql -U postgres -c 'CREATE DATABASE $DB_NAME;'"
        exit 1
    fi
fi

# マイグレーションを実行
echo ""
echo "🔄 マイグレーションを実行します..."
cd backend

if npm run migrate; then
    echo ""
    echo "✅ データベースのセットアップが完了しました！"
    echo ""
    echo "次のステップ:"
    echo "  1. バックエンドを起動: cd backend && npm run dev"
    echo "  2. フロントエンドを起動: cd frontend && npm start"
else
    echo ""
    echo "❌ マイグレーションに失敗しました"
    echo ""
    echo "トラブルシューティング:"
    echo "  1. backend/.env のデータベース設定を確認"
    echo "  2. PostgreSQLサービスが起動しているか確認"
    echo "  3. ユーザー権限を確認"
    exit 1
fi