# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## 必須開発コマンド

### 統合開発コマンド（ルートディレクトリ）
```bash
npm run dev                   # フロント・バック同時起動 (concurrently)
npm run build                 # 全体ビルド (フロント + バック)
npm test                      # 全テスト実行
npm run test:coverage         # カバレッジレポート付きテスト
npm run install:all           # 全依存関係インストール
npm run lint                  # 全体コードチェック
npm run format                # Prettier自動フォーマット
npm run security:audit        # セキュリティ監査実行
npm run create-admin          # 管理者ユーザー作成
```

### バックエンド開発
```bash
cd backend
npm install                   # 依存関係のインストール
npm run dev                   # 開発サーバー起動 (nodemon)
npm run build                 # 本番ビルド (ESBuild使用)
npm run start                 # 本番サーバー起動
npm run start:dev             # 開発環境で起動（hot reload無し）
npm test                      # 全テスト実行
npm run test:watch           # テストウォッチモード
npm run migrate              # データベースマイグレーション
npm run reindex              # Elasticsearch再インデックス
./simple-start.sh            # シンプル起動スクリプト（Docker用）
```

### フロントエンド開発
```bash
cd frontend
npm install                   # 依存関係のインストール
npm start                     # 開発サーバー起動 (port 3000)
npm run build                # 本番ビルド
npm test                      # テスト実行
npm run analyze              # バンドル分析
npm run performance-test     # パフォーマンステスト
npm run lighthouse           # Lighthouseテスト
npm run source-map-explorer  # バンドル詳細分析
```

### Docker環境
```bash
docker-compose up -d          # 全サービス起動
docker-compose logs -f        # ログ監視
docker-compose down          # 全サービス停止
docker-compose -f docker-compose.prod.yml up -d  # 本番環境起動
```

### データベース操作
```bash
npm run db:setup              # データベース初期設定
npm run db:migrate            # マイグレーション実行
npm run db:seed               # テストデータ投入
npm run db:reset              # データベースリセット
npm run db:test               # データベース接続テスト
```

### 単一テストの実行
```bash
# バックエンド単一テスト（Jest）
cd backend
npm test -- --testPathPattern="auth"        # authテストのみ実行
npm test -- --testNamePattern="login"       # loginに関するテストのみ
npm test -- src/__tests__/auth.test.js      # 特定ファイルのテスト

# フロントエンド単一テスト（React Testing Library）
cd frontend
npm test -- --testPathPattern="QuestCard"   # QuestCardテストのみ実行
npm test -- --watchAll=false               # ウォッチモード無しで実行
```

## アーキテクチャ概要

### システム構成
このプロジェクトは**マイクロサービス対応のモノリシックアーキテクチャ**として設計されています。現在はモノリシックですが、将来的なマイクロサービス化を考慮した構造になっています。

### フロントエンド・バックエンド通信
- **REST API**: Express.jsによる RESTful API (ポート: 5000)
- **WebSocket**: Socket.io によるリアルタイム通信
- **認証**: Google OAuth + JWT トークン + オプショナル2FA

### データフロー
```
User → React (3000) → API Gateway → Express (5000) → PostgreSQL
                  ↓                        ↓
              WebSocket ← Socket.io ← Redis Pub/Sub
```

### バックエンドアーキテクチャ
MVCパターンに基づく層構造:
- **Routes層** (`backend/src/routes/`): HTTPリクエストの受付とレスポンス
  - auth.js: Google OAuth + 2FA認証
  - quests.js: クエスト管理API
  - users.js: ユーザー管理
  - admin.js: 管理者機能
  - notifications.js: 通知システム
  - search.js: Elasticsearch検索
  - twoFA.js: 二要素認証
- **Service層** (`backend/src/services/`): ビジネスロジックの実装
  - questService.js: クエスト関連ロジック
  - userService.js: ユーザー管理ロジック
  - notification.js: 通知処理
  - cache.js: Redisキャッシュ管理
  - search.js: 検索機能
- **Model層** (`backend/src/models/`): Sequelize ORMによるデータモデル
  - User.js: ユーザーモデル（認証情報含む）
  - Quest.js: クエストモデル（JSONB型requirements）
  - QuestHistory.js: 変更履歴の監査ログ
  - Notification.js: 通知データ
  - Achievement.js, UserAchievement.js: ゲーミフィケーション
- **Middleware層** (`backend/src/middleware/`): 認証、エラーハンドリング、セキュリティ
  - auth.js: JWT認証・認可
  - security.js: セキュリティヘッダー・レート制限
  - errorHandler.js: 統一エラーハンドリング
  - validation.js: 入力検証

### フロントエンドアーキテクチャ
React + TypeScriptによるコンポーネントベース:
- **Components** (`frontend/src/components/`): 再利用可能なUIコンポーネント
  - QuestBoard.tsx: メインボード画面
  - QuestCard.tsx: クエスト個別カード
  - QuestForm.tsx: クエスト作成・編集フォーム
  - AdminPanel.tsx: 管理者パネル
  - GoogleLogin.tsx: OAuth認証コンポーネント
  - NotificationCenter.tsx: 通知センター
- **Hooks** (`frontend/src/hooks/`): カスタムフック
  - usePerformance.tsx: パフォーマンス監視
  - useTheme.tsx: テーマ切り替え
  - useCache.js: フロントエンドキャッシュ
- **Services** (`frontend/src/services/`): API通信とWebSocket管理
  - api.ts: REST API通信
  - auth.ts: 認証管理
  - socket.ts: WebSocket/Socket.io管理
  - apiCache.js: APIレスポンスキャッシュ
- **Contexts** (`frontend/src/contexts/`): グローバル状態管理
  - AuthContext.tsx: 認証状態管理

### データベース設計
PostgreSQL + Sequelize ORM:
- **User**: ユーザー情報と認証データ
- **Quest**: クエスト本体（JSONB型でrequirements保存）
- **QuestHistory**: 変更履歴の監査ログ
- **Notification**: 通知システム
- **Achievement/UserAchievement**: ゲーミフィケーション

### キャッシュ戦略
Redis による多層キャッシュ:
- セッション管理
- APIレスポンスキャッシュ
- リアルタイム通信のPub/Sub
- 一時的なデータストレージ

### セキュリティアーキテクチャ
- **認証**: Passport.js + Google OAuth
- **認可**: JWTトークンベースのRBAC
- **セキュリティヘッダー**: Helmet.js
- **レート制限**: express-rate-limit
- **入力検証**: Joi (未実装だが設計済み)

### 監視・ロギング
- **メトリクス**: Prometheus形式 (`/metrics`)
- **ロギング**: Winston + 日次ローテーション
- **エラートラッキング**: Sentry統合
- **パフォーマンス**: カスタムパフォーマンスモニター

### デプロイメント構成
- **ローカル**: Docker Compose
- **本番**: Kubernetes (EKS) + Terraform
- **CI/CD**: GitHub Actions
- **インフラ**: AWS (ALB, RDS, ElastiCache, CloudFront)

## 重要な設定ファイル

### 環境変数設定
プロジェクトルートに `.env` ファイルが必要:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=questboard
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT
JWT_SECRET=your_jwt_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Docker設定
- **docker-compose.yml**: 開発環境（PostgreSQL, Redis, Elasticsearch）
- **docker-compose.prod.yml**: 本番環境設定
- **docker-compose.monitoring.yml**: 監視スタック（Prometheus, Grafana）
- **Dockerfile.backend**: Node.js バックエンド用
- **Dockerfile.frontend**: React フロントエンド用

### 認証・セキュリティ設定
- Google OAuth設定が必要（Google Cloud Console）
- JWTトークンベース認証
- オプショナル2FA（TOTP）
- セキュリティヘッダー（Helmet.js）
- レート制限設定

## トラブルシューティング

### よくある問題
1. **データベース接続エラー**: PostgreSQLとRedisが起動していることを確認
2. **認証エラー**: Google OAuth設定とクライアントID/シークレットを確認
3. **ポート競合**: デフォルトポート（3000, 5000, 5432, 6379）の使用状況確認
4. **Docker起動失敗**: `docker-compose down && docker-compose up -d` で再起動

### ログの確認方法
```bash
# アプリケーションログ
docker-compose logs -f backend
docker-compose logs -f frontend

# システムログ
tail -f backend/logs/combined-*.log
tail -f backend/logs/error-*.log
```