---
title: Google OAuth 設定ガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, oauth, google, authentication, setup]
---

# Google OAuth 設定ガイド

## 開発環境用設定

現在、開発環境用のダミー設定が適用されています。
実際のGoogle OAuthを使用する場合は、以下の手順に従ってください。

## 本番用Google OAuth設定手順

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス

2. 新しいプロジェクトを作成または既存のプロジェクトを選択

3. 「APIとサービス」→「認証情報」に移動

4. 「認証情報を作成」→「OAuth クライアント ID」を選択

5. アプリケーションの種類で「ウェブ アプリケーション」を選択

6. 以下の設定を行う：
   - 名前: Quest Board (任意)
   - 承認済みの JavaScript 生成元:
     - http://localhost:3000 (開発用)
     - https://your-domain.com (本番用)
   - 承認済みのリダイレクト URI: 不要

7. 作成後、クライアントIDをコピー

8. 両方の.envファイルを更新：
   - backend/.env: GOOGLE_CLIENT_ID=<your-client-id>
   - frontend/.env: REACT_APP_GOOGLE_CLIENT_ID=<your-client-id>

## 開発環境での認証テスト

現在の設定では、開発環境で以下のテストユーザーが使用可能です：

- 一般ユーザー: ログインボタンをクリック
- 管理者ユーザー: 開発ツールのコンソールで以下を実行
  ```javascript
  // 管理者としてログイン
  window.__DEV_LOGIN_AS_ADMIN__ = true;
  ```

## トラブルシューティング

- エラー「Invalid client id」が表示される場合
  → クライアントIDが正しくコピーされているか確認

- エラー「Origin not allowed」が表示される場合
  → Google Cloud Consoleで承認済みの生成元を確認

- 本番環境でのみエラーが発生する場合
  → HTTPSが正しく設定されているか確認
