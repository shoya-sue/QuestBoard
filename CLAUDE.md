# CLAUDE.md - プロジェクト固有の指示

## Git コミットルール

### Co-Authored-By を使用しない
このプロジェクトでは、git commitを実行する際に Co-Authored-By を**絶対に付与しない**でください。

```bash
# ❌ 悪い例（使用しない）
git commit -m "feat: 新機能の追加

Co-Authored-By: Claude <noreply@anthropic.com>"

# ✅ 良い例（こちらを使用）
git commit -m "feat: 新機能の追加"
```

### コミットの粒度
- 機能別に細かくコミットを分割する
- 各コミットは独立した変更単位とする
- コミットメッセージは日本語で記述

## プロジェクト情報

### 技術スタック
- **バックエンド**: Node.js, Express, Sequelize
- **フロントエンド**: React, TypeScript
- **データベース**: PostgreSQL
- **コンテナ**: Docker, Docker Compose
- **ビルドツール**: ESBuild

### 開発コマンド
```bash
# バックエンド開発
cd backend
npm run dev

# フロントエンド開発
cd frontend
npm start

# Docker環境
docker-compose up -d
```

### コード品質チェック
```bash
# リント実行
npm run lint

# 型チェック
npm run typecheck
```