# Quest Board セットアップ手順

## 動作確認結果

✅ **プロジェクトは正常に動作する状態です**

ただし、Google認証機能を使用するには以下の設定が必要です：

## Google OAuth設定手順

### 1. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「認証情報」を選択
4. 「認証情報を作成」→「OAuth クライアント ID」を選択
5. アプリケーションの種類で「ウェブアプリケーション」を選択
6. 以下の設定を行う：
   - 名前: Quest Board
   - 承認済みの JavaScript 生成元: `http://localhost:3000`
   - 承認済みのリダイレクト URI: `http://localhost:3000`
7. 作成後、クライアントIDをコピー

### 2. 環境変数の設定

#### バックエンド（`/backend/.env`）:
```env
JWT_SECRET=your-secure-random-string-here
PORT=3001
GOOGLE_CLIENT_ID=取得したクライアントID
ADMIN_EMAILS=admin@example.com
```

#### フロントエンド（`/frontend/.env`）:
```env
REACT_APP_GOOGLE_CLIENT_ID=取得したクライアントID
```

## 起動手順

### 1. 依存関係のインストール（初回のみ）
```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 2. サーバーの起動
```bash
# ターミナル1：バックエンドサーバー
cd backend
npm run dev

# ターミナル2：フロントエンドサーバー
cd frontend
npm start
```

### 3. アクセス
ブラウザで `http://localhost:3000` にアクセス

## デモモード（Google認証なし）での動作確認

Google認証の設定をスキップして動作確認したい場合は、以下の手順で可能です：

1. `frontend/src/components/GoogleLogin.tsx`の`onSuccess`関数を直接呼び出すボタンを追加
2. テスト用のダミートークンを使用

## 動作確認項目

### ✅ 確認済み
- [x] プロジェクト構造の整合性
- [x] 依存関係のインストール
- [x] バックエンドサーバーの起動
- [x] WebSocketサーバーの初期化
- [x] クエストデータの存在
- [x] ユーザーデータの存在

### ⚠️ 要設定
- [ ] Google OAuth クライアントIDの設定
- [ ] 本番環境用JWT_SECRETの設定
- [ ] 管理者メールアドレスの設定

## トラブルシューティング

### ポートが使用中の場合
```bash
# 3001ポートを使用しているプロセスを確認
lsof -i :3001

# 3000ポートを使用しているプロセスを確認
lsof -i :3000
```

### npm installでエラーが出る場合
```bash
# キャッシュをクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### CORSエラーが出る場合
フロントエンドとバックエンドが異なるポートで動作していることを確認してください。

## 本番環境へのデプロイ

本番環境では以下の点に注意してください：

1. 環境変数を本番用に設定
2. HTTPSの設定
3. Google OAuthの承認済みドメインに本番URLを追加
4. データベースのバックアップ設定
5. ログ管理の設定