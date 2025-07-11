# Quest Board System

シンプルなクエストボード管理システム。フロントエンドでクエストの表示・管理を行い、バックエンドでクエストデータをMarkdownファイルとして保存します。

## システム概要

- **フロントエンド**: React
- **バックエンド**: Express.js
- **データ保存**: Markdownファイル
- **表示対象**: 未受注・受注中のクエストのみ（達成済みは非表示）

## 機能

### フロントエンド
- クエスト一覧表示（未受注・受注中のみ）
- クエストの受注・完了操作
- クエストの詳細表示

### バックエンド
- クエストデータのMarkdownファイル保存
- クエスト一覧取得API
- クエスト状態更新API
- MarkdownファイルのURLパス返却

## プロジェクト構成

```
quest-board/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QuestBoard.js
│   │   │   ├── QuestCard.js
│   │   │   └── QuestDetail.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── public/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── quests.js
│   │   ├── services/
│   │   │   └── questService.js
│   │   ├── utils/
│   │   │   └── fileUtils.js
│   │   └── app.js
│   ├── data/
│   │   └── quests/
│   │       └── *.md
│   └── package.json
└── README.md
```

## セットアップ

### 前提条件
- Node.js (v14以上)
- npm または yarn

### バックエンドセットアップ

1. バックエンドディレクトリに移動
```bash
cd backend
```

2. パッケージインストール
```bash
npm install express cors fs-extra path uuid
```

3. 開発用依存関係をインストール
```bash
npm install --save-dev nodemon
```

4. サーバー起動
```bash
npm run dev
```

### フロントエンドセットアップ

1. フロントエンドディレクトリに移動
```bash
cd frontend
```

2. Reactアプリを作成
```bash
npx create-react-app . --template typescript
```

3. 追加パッケージをインストール
```bash
npm install axios
```

4. アプリケーション起動
```bash
npm start
```

## API仕様

### クエスト一覧取得
```
GET /api/quests
```

**レスポンス例:**
```json
{
  "quests": [
    {
      "id": "quest-001",
      "title": "魔王討伐",
      "description": "邪悪な魔王を倒してください",
      "status": "available",
      "reward": "1000G",
      "difficulty": "S",
      "mdFilePath": "/data/quests/quest-001.md"
    }
  ]
}
```

### クエスト詳細取得
```
GET /api/quests/:id
```

### クエスト受注
```
POST /api/quests/:id/accept
```

### クエスト完了
```
POST /api/quests/:id/complete
```

## クエストステータス

- `available`: 未受注（表示対象）
- `in_progress`: 受注中（表示対象）
- `completed`: 達成済み（非表示）

## Markdownファイル形式

各クエストは以下の形式でMarkdownファイルとして保存されます：

```markdown
---
id: quest-001
title: 魔王討伐
status: available
reward: 1000G
difficulty: S
created_at: 2025-01-01T00:00:00Z
updated_at: 2025-01-01T00:00:00Z
---

# 魔王討伐

## 依頼内容
邪悪な魔王が復活しました。勇者の力で魔王を倒してください。

## 報酬
- 1000G
- 魔王の宝石

## 注意事項
- 危険度：S級
- 推奨レベル：50以上
```

## 開発時の注意点

### フロントエンド
- 達成済み（completed）のクエストは表示しない
- クエストの状態変更時にリアルタイムで表示を更新
- エラーハンドリングを適切に実装

### バックエンド
- Markdownファイルの読み書き時のエラーハンドリング
- ファイルパスの正規化
- CORS設定の適切な実装

## 実装例

### package.json（バックエンド）
```json
{
  "name": "quest-board-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "fs-extra": "^11.1.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

### package.json（フロントエンド）
```json
{
  "name": "quest-board-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.3.0"
  }
}
```

## 今後の拡張案

- ユーザー認証機能
- クエスト検索・フィルタリング
- 難易度別表示
- クエスト作成機能
- 完了履歴の表示機能

## ライセンス

MIT License
