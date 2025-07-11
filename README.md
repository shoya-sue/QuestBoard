# 🗡️ Quest Board - 冒険者クエスト掲示板

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18.0-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Socket.io-4.0-010101?style=for-the-badge&logo=socket.io" alt="Socket.io">
</p>

## 📋 目次

- [概要](#-概要)
- [主な機能](#-主な機能)
- [技術スタック](#-技術スタック)
- [セットアップ](#-セットアップ)
- [使い方](#-使い方)
- [API仕様](#-api仕様)
- [プロジェクト構成](#-プロジェクト構成)
- [開発者向け情報](#-開発者向け情報)

## 🎯 概要

Quest Boardは、RPGゲームの世界観を再現した**クエスト管理システム**です。  
冒険者（ユーザー）はクエストを確認・受注・完了でき、ギルドマスター（管理者）はクエストの作成・編集・削除が可能です。

### ✨ 特徴

- 🔐 **Google OAuth認証** - 安全でシンプルなログイン
- 🔄 **リアルタイム更新** - WebSocketによる即時反映
- 📱 **レスポンシブデザイン** - PC・タブレット・スマホ対応
- 📝 **Markdownベース** - クエストデータをMarkdownで管理
- 🎨 **美しいUI** - RPGゲーム風のデザイン

## 🚀 主な機能

### 👤 ユーザー機能
- ✅ クエスト一覧の閲覧
- ✅ クエストの詳細確認
- ✅ クエストの受注・完了
- ✅ 完了履歴の確認
- ✅ 検索・フィルタリング（難易度別、ステータス別）
- ✅ リアルタイム通知

### 👑 管理者機能
- ✅ クエストの作成・編集・削除
- ✅ 管理画面での一括管理
- ✅ ユーザー管理

### 🔧 システム機能
- ✅ ページネーション
- ✅ WebSocketリアルタイム更新
- ✅ エラーハンドリング
- ✅ 包括的なテストスイート

## 🛠️ 技術スタック

### フロントエンド
```
React 18 + TypeScript
├── @react-oauth/google    # Google認証
├── axios                  # API通信
├── socket.io-client       # WebSocket
└── CSS                    # スタイリング
```

### バックエンド
```
Node.js + Express
├── socket.io              # WebSocket
├── google-auth-library    # Google認証
├── jsonwebtoken          # JWT認証
├── fs-extra              # ファイル操作
└── uuid                  # ID生成
```

### テスト
```
├── Jest                   # テストフレームワーク
├── React Testing Library  # Reactコンポーネントテスト
└── Supertest             # APIテスト
```

## 📦 セットアップ

### 前提条件
- Node.js 16以上
- npm または yarn
- Google Cloud ConsoleアカウントID取得済み）

### 1️⃣ クローン
```bash
git clone https://github.com/yourusername/QuestBoard.git
cd QuestBoard
```

### 2️⃣ 環境変数の設定

#### バックエンド (`backend/.env`)
```env
PORT=3001
JWT_SECRET=your-secure-random-string-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

#### フロントエンド (`frontend/.env`)
```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3️⃣ 依存関係のインストール
```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 4️⃣ 起動
```bash
# ターミナル1: バックエンド
cd backend
npm run dev

# ターミナル2: フロントエンド
cd frontend
npm start
```

### 5️⃣ アクセス
ブラウザで http://localhost:3000 にアクセス

## 📖 使い方

### 冒険者（ユーザー）として

1. **ログイン**
   - Googleアカウントでログイン

2. **クエストを探す**
   - 一覧から興味のあるクエストを選択
   - 検索バーやフィルターで絞り込み

3. **クエストを受注**
   - 詳細を確認して「受注する」ボタンをクリック

4. **クエストを完了**
   - タスクを終えたら「完了する」ボタンをクリック

### ギルドマスター（管理者）として

1. **管理画面へアクセス**
   - 管理者権限でログイン後、「管理画面」ボタンをクリック

2. **クエスト管理**
   - 新規作成：「新規クエスト作成」ボタン
   - 編集：各クエストの「編集」ボタン
   - 削除：各クエストの「削除」ボタン

## 📡 API仕様

### 認証

#### Google認証
```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "google-id-token"
}
```

### クエスト

#### 一覧取得
```http
GET /api/quests?page=1&limit=10
```

#### 詳細取得
```http
GET /api/quests/:id
```

#### 受注
```http
POST /api/quests/:id/accept
Authorization: Bearer <token>
```

#### 完了
```http
POST /api/quests/:id/complete
Authorization: Bearer <token>
```

#### 作成（管理者のみ）
```http
POST /api/quests
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "クエスト名",
  "description": "クエストの説明",
  "reward": "報酬",
  "difficulty": "A"
}
```

## 📁 プロジェクト構成

```
QuestBoard/
├── 📂 backend/
│   ├── 📂 src/
│   │   ├── 📂 __tests__/        # テストファイル
│   │   ├── 📂 middleware/       # 認証・エラーハンドリング
│   │   ├── 📂 routes/           # APIエンドポイント
│   │   ├── 📂 services/         # ビジネスロジック
│   │   ├── 📂 utils/            # ユーティリティ
│   │   └── 📄 app.js            # エントリーポイント
│   └── 📂 data/
│       ├── 📂 quests/           # クエストMarkdownファイル
│       └── 📄 users.json        # ユーザーデータ
│
└── 📂 frontend/
    ├── 📂 src/
    │   ├── 📂 components/       # Reactコンポーネント
    │   │   └── 📂 __tests__/    # コンポーネントテスト
    │   ├── 📂 contexts/         # Reactコンテキスト
    │   ├── 📂 services/         # APIサービス
    │   └── 📄 App.tsx           # ルートコンポーネント
    └── 📂 public/               # 静的ファイル
```

## 🧪 テスト

### テストの実行
```bash
# フロントエンド
cd frontend
npm test

# バックエンド
cd backend
npm test
```

### カバレッジレポート
```bash
npm test -- --coverage
```

## 👩‍💻 開発者向け情報

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・設定変更
```

### ブランチ戦略
- `main` - 本番環境
- `develop` - 開発環境
- `feature/*` - 機能開発
- `hotfix/*` - 緊急修正

### デバッグ

#### バックエンドログ確認
```bash
cd backend
npm run dev
# コンソールでログを確認
```

#### フロントエンドデバッグ
ブラウザの開発者ツール（F12）でコンソールとネットワークタブを確認

## 🚧 トラブルシューティング

### ポートが使用中の場合
```bash
# Linux/Mac
lsof -i :3000
lsof -i :3001

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### npm installでエラーが出る場合
```bash
# キャッシュクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### Google認証が動作しない場合
1. Google Cloud Consoleで承認済みドメインを確認
2. クライアントIDが正しく設定されているか確認
3. http://localhost:3000 が承認済みJavaScript生成元に含まれているか確認

## 🎮 今後の拡張案

- [ ] ユーザープロフィール機能
- [ ] クエスト評価システム
- [ ] コメント機能
- [ ] 画像アップロード
- [ ] メール通知
- [ ] 多言語対応（i18n）
- [ ] PWA対応
- [ ] ダークモード

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します！  
大きな変更の場合は、まずIssueで相談してください。

---

<p align="center">
  Made with ❤️ by Quest Board Team
</p>