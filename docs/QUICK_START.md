# 🚀 クイックスタートガイド

Quest Boardを**5分で起動**するためのガイドです。

## 📋 必要なもの

- ✅ Node.js 16以上
- ✅ Git
- ✅ Googleアカウント（認証用）

## 🏃‍♂️ 3ステップで起動

### ステップ1: プロジェクトをダウンロード

```bash
# プロジェクトをクローン
git clone https://github.com/yourusername/QuestBoard.git
cd QuestBoard
```

### ステップ2: セットアップスクリプトを実行

```bash
# 一括セットアップ（バックエンド＆フロントエンド）
./setup.sh
```

> **Windows の場合**: `setup.bat` を実行

### ステップ3: アプリケーションを起動

```bash
# 両方のサーバーを同時に起動
npm run start:all
```

## 🎉 完了！

ブラウザで **http://localhost:3000** にアクセスしてください。

---

## 🔧 手動セットアップ（上記が動作しない場合）

### 1. バックエンドセットアップ

```bash
# バックエンドディレクトリへ移動
cd backend

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env

# サーバーを起動
npm run dev
```

### 2. フロントエンドセットアップ

**新しいターミナルを開いて：**

```bash
# フロントエンドディレクトリへ移動
cd frontend

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env

# 開発サーバーを起動
npm start
```

## 🔐 Google認証の設定（任意）

Google認証を使用する場合は、以下の手順で設定してください：

### 1. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新規プロジェクトを作成
3. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID」を作成
4. 承認済みの JavaScript 生成元に追加：
   - `http://localhost:3000`

### 2. 環境変数に設定

取得したクライアントIDを環境変数に設定：

```bash
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# frontend/.env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## 🎮 デモモード（認証なし）

Google認証の設定をスキップしたい場合は、デモモードで起動できます：

```bash
# デモモードで起動
npm run start:demo
```

## ❓ うまくいかない場合

### ポートが使用中
```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :3001

# プロセスを終了
kill -9 <PID>
```

### npm installでエラー
```bash
# キャッシュをクリア
npm cache clean --force

# 再度インストール
npm install
```

### その他の問題
[トラブルシューティングガイド](./TROUBLESHOOTING.md)を参照してください。

## 📚 次のステップ

- 📖 [使い方ガイド](./USER_GUIDE.md) - 基本的な使い方
- 🛠️ [開発者ガイド](./DEVELOPER_GUIDE.md) - カスタマイズ方法
- 📡 [API仕様書](./API_REFERENCE.md) - API詳細

---

<p align="center">
  楽しいクエストライフを！ 🗡️✨
</p>