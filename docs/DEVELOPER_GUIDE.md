# 👩‍💻 開発者ガイド

Quest Boardの開発・カスタマイズのための詳細ガイドです。

## 📋 目次

1. [アーキテクチャ概要](#-アーキテクチャ概要)
2. [開発環境のセットアップ](#-開発環境のセットアップ)
3. [コード構造](#-コード構造)
4. [主要コンポーネント](#-主要コンポーネント)
5. [APIエンドポイント](#-apiエンドポイント)
6. [状態管理](#-状態管理)
7. [スタイリング](#-スタイリング)
8. [テスト](#-テスト)
9. [デプロイ](#-デプロイ)

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   React App     │────▶│   Express API   │────▶│  Markdown Files │
│   (Frontend)    │◀────│   (Backend)     │◀────│   (Storage)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │             │
              │  Socket.io  │
              │ (Real-time) │
              │             │
              └─────────────┘
```

## 🛠️ 開発環境のセットアップ

### 必要なツール

- **Node.js** 16.x以上
- **npm** または **yarn**
- **VSCode**（推奨）
- **Git**

### VSCode拡張機能（推奨）

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "dsznajder.es7-react-js-snippets",
    "bradlc.vscode-tailwindcss",
    "christian-kohler.npm-intellisense"
  ]
}
```

### 環境変数

#### `.env.development`（開発用）
```env
# Backend
PORT=3001
JWT_SECRET=dev-secret-key-not-for-production
GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
ADMIN_EMAILS=dev@example.com

# Frontend
REACT_APP_GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:3001/api
```

## 📁 コード構造

### フロントエンド構造

```
frontend/src/
├── components/          # UIコンポーネント
│   ├── common/         # 共通コンポーネント
│   ├── quest/          # クエスト関連
│   └── auth/           # 認証関連
├── contexts/           # React Context
├── hooks/              # カスタムフック
├── services/           # API通信
├── styles/             # グローバルスタイル
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数
```

### バックエンド構造

```
backend/src/
├── controllers/        # コントローラー層
├── middleware/         # Express ミドルウェア
├── models/            # データモデル
├── routes/            # APIルート定義
├── services/          # ビジネスロジック
├── utils/             # ヘルパー関数
└── validators/        # 入力検証
```

## 🧩 主要コンポーネント

### フロントエンドコンポーネント

#### QuestBoard
メインコンテナコンポーネント。全体の状態管理を行います。

```typescript
// 使用例
<QuestBoard>
  <QuestFilter onFilterChange={handleFilter} />
  <QuestList quests={filteredQuests} />
  <Pagination {...paginationProps} />
</QuestBoard>
```

#### QuestCard
個別のクエスト表示カード。

```typescript
interface QuestCardProps {
  quest: Quest;
  onClick: (quest: Quest) => void;
  selected: boolean;
}
```

#### AuthContext
認証状態を管理するContext。

```typescript
const { user, login, logout, isAdmin } = useAuth();
```

### バックエンドサービス

#### QuestService
クエストに関するビジネスロジック。

```javascript
class QuestService {
  async getActiveQuests(page, limit) { /* ... */ }
  async createQuest(questData) { /* ... */ }
  async updateQuestStatus(id, status) { /* ... */ }
}
```

## 📡 APIエンドポイント

### 認証 API

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| POST | `/api/auth/google` | Google認証 | ❌ |
| GET | `/api/auth/verify` | トークン検証 | ✅ |

### クエスト API

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|---------------|------|------|------|
| GET | `/api/quests` | 一覧取得 | ❌ | - |
| GET | `/api/quests/:id` | 詳細取得 | ❌ | - |
| POST | `/api/quests` | 作成 | ✅ | Admin |
| PUT | `/api/quests/:id` | 更新 | ✅ | Admin |
| DELETE | `/api/quests/:id` | 削除 | ✅ | Admin |
| POST | `/api/quests/:id/accept` | 受注 | ✅ | User |
| POST | `/api/quests/:id/complete` | 完了 | ✅ | User |

## 🔄 状態管理

### グローバル状態

```typescript
// AuthContext
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// QuestContext (オプション)
interface QuestState {
  quests: Quest[];
  selectedQuest: Quest | null;
  filters: FilterOptions;
}
```

### ローカル状態

コンポーネント固有の状態は`useState`で管理：

```typescript
const [showModal, setShowModal] = useState(false);
const [formData, setFormData] = useState(initialData);
```

## 🎨 スタイリング

### CSS命名規則（BEM）

```css
/* Block */
.quest-card { }

/* Element */
.quest-card__title { }
.quest-card__description { }

/* Modifier */
.quest-card--selected { }
.quest-card--completed { }
```

### カラーパレット

```css
:root {
  /* Primary Colors */
  --primary: #2196f3;
  --primary-dark: #1976d2;
  
  /* Status Colors */
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
  
  /* Difficulty Colors */
  --diff-easy: #4caf50;
  --diff-medium: #ff9800;
  --diff-hard: #f44336;
}
```

## 🧪 テスト

### ユニットテスト

```bash
# コンポーネントテスト例
npm test QuestCard.test.tsx

# サービステスト例
npm test questService.test.js
```

### 統合テスト

```javascript
// API統合テスト例
describe('Quest API', () => {
  it('should create a new quest', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(questData);
    
    expect(response.status).toBe(201);
  });
});
```

### E2Eテスト（今後実装）

```javascript
// Cypress例
describe('Quest Flow', () => {
  it('should complete quest lifecycle', () => {
    cy.visit('/');
    cy.contains('ログイン').click();
    // ... テスト続行
  });
});
```

## 🚀 デプロイ

### 本番環境の準備

1. **環境変数の設定**
   ```bash
   # .env.production
   NODE_ENV=production
   JWT_SECRET=secure-random-string
   ```

2. **ビルド**
   ```bash
   # フロントエンド
   cd frontend && npm run build
   
   # バックエンド
   cd backend && npm run build
   ```

3. **最適化**
   - 画像の圧縮
   - コード分割
   - キャッシュ設定

### デプロイオプション

#### Vercel（フロントエンド）
```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

#### Heroku（バックエンド）
```json
{
  "name": "questboard-api",
  "scripts": {
    "start": "node src/app.js"
  },
  "engines": {
    "node": "16.x"
  }
}
```

## 🔧 カスタマイズ例

### 新しいクエストフィールドの追加

1. **Markdownフロントマター更新**
   ```yaml
   ---
   id: quest-001
   title: クエスト名
   location: 冒険者の街  # 新規追加
   ---
   ```

2. **型定義の更新**
   ```typescript
   interface Quest {
     // ... 既存フィールド
     location?: string;
   }
   ```

3. **UIコンポーネントの更新**
   ```tsx
   {quest.location && (
     <span className="quest-location">
       📍 {quest.location}
     </span>
   )}
   ```

## 📚 参考資料

- [React公式ドキュメント](https://react.dev/)
- [Express.js公式ガイド](https://expressjs.com/)
- [Socket.io公式ドキュメント](https://socket.io/docs/)
- [TypeScript公式ハンドブック](https://www.typescriptlang.org/docs/)

---

<p align="center">
  Happy Coding! 🚀
</p>