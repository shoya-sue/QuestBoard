#!/bin/bash

echo "🚀 Quest Board セットアップを開始します..."

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Node.jsバージョンチェック
echo "📋 Node.jsバージョンを確認中..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js 16以上が必要です${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js v$(node -v) が検出されました${NC}"

# バックエンドセットアップ
echo -e "\n${YELLOW}📦 バックエンドのセットアップ...${NC}"
cd backend || exit

# 環境変数ファイルのコピー
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env ファイルを作成しました${NC}"
else
    echo -e "${YELLOW}⚠️  .env ファイルは既に存在します${NC}"
fi

# 依存関係のインストール
echo "📥 バックエンドの依存関係をインストール中..."
npm install

# フロントエンドセットアップ
echo -e "\n${YELLOW}📦 フロントエンドのセットアップ...${NC}"
cd ../frontend || exit

# 環境変数ファイルのコピー
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env ファイルを作成しました${NC}"
else
    echo -e "${YELLOW}⚠️  .env ファイルは既に存在します${NC}"
fi

# 依存関係のインストール
echo "📥 フロントエンドの依存関係をインストール中..."
npm install

# セットアップ完了
echo -e "\n${GREEN}🎉 セットアップが完了しました！${NC}"
echo -e "\n次の手順:"
echo "1. backend/.env と frontend/.env にGoogle Client IDを設定"
echo "2. 以下のコマンドでサーバーを起動:"
echo -e "${YELLOW}   cd backend && npm run dev${NC}"
echo -e "${YELLOW}   cd frontend && npm start${NC}"
echo -e "\n${GREEN}Happy Questing! 🗡️✨${NC}"