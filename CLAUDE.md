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

### バックエンド開発
```bash
cd backend
npm install                   # 依存関係のインストール
npm run dev                   # 開発サーバー起動 (nodemon)
npm run build                 # 本番ビルド (ESBuild使用)
npm run start                 # 本番サーバー起動
npm test                      # 全テスト実行
npm run test:watch           # テストウォッチモード
npm run migrate              # データベースマイグレーション
./simple-start.sh            # シンプル起動スクリプト
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
```

### Docker環境
```bash
docker-compose up -d          # 全サービス起動
docker-compose logs -f        # ログ監視
docker-compose down          # 全サービス停止
```

### 単一テストの実行
```bash
# バックエンド単一テスト
cd backend
npm test -- path/to/test.js

# フロントエンド単一テスト
cd frontend
npm test -- --testPathPattern="ComponentName"
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
- **Service層** (`backend/src/services/`): ビジネスロジックの実装
- **Model層** (`backend/src/models/`): Sequelize ORMによるデータモデル
- **Middleware層** (`backend/src/middleware/`): 認証、エラーハンドリング、セキュリティ

### フロントエンドアーキテクチャ
React + TypeScriptによるコンポーネントベース:
- **Components**: 再利用可能なUIコンポーネント
- **Hooks**: カスタムフック（usePerformance等）
- **Services**: API通信とWebSocket管理
- **Contexts**: グローバル状態管理（認証等）

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