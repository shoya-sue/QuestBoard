---
title: API リファレンス
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [api, reference, rest-api, endpoints, documentation]
---

# 📡 API リファレンス

Quest Board REST API の完全な仕様書です。

## 基本情報

### ベースURL
```
開発環境: http://localhost:3001/api
本番環境: https://api.questboard.com/api
```

### 認証方式
JWT Bearer Token を使用します。

```http
Authorization: Bearer <your-jwt-token>
```

### レスポンス形式
すべてのレスポンスは JSON 形式です。

```json
{
  "success": true,
  "data": { /* レスポンスデータ */ },
  "error": null
}
```

### エラーレスポンス
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

## 🔐 認証 API

### Google認証

Google ID トークンを使用してログインします。

```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "google-id-token-here"
}
```

#### 成功レスポンス (200 OK)
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "冒険者太郎",
    "role": "user"
  }
}
```

#### エラーレスポンス
- `400 Bad Request` - 認証情報が不足
- `401 Unauthorized` - 無効なGoogleトークン
- `500 Internal Server Error` - サーバーエラー

### トークン検証

JWT トークンの有効性を確認します。

```http
GET /api/auth/verify
Authorization: Bearer <jwt-token>
```

#### 成功レスポンス (200 OK)
```json
{
  "valid": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "冒険者太郎",
    "role": "user"
  }
}
```

## 📋 クエスト API

### クエスト一覧取得

アクティブなクエスト（未受注・受注中）の一覧を取得します。

```http
GET /api/quests?page=1&limit=10&difficulty=A&status=available&search=ドラゴン
```

#### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| page | number | ❌ | 1 | ページ番号 |
| limit | number | ❌ | 10 | 1ページの件数 |
| difficulty | string | ❌ | - | 難易度フィルター (E,D,C,B,A,S,SS) |
| status | string | ❌ | - | ステータスフィルター |
| search | string | ❌ | - | 検索キーワード |

#### 成功レスポンス (200 OK)
```json
{
  "quests": [
    {
      "id": "quest-001",
      "title": "ドラゴン討伐",
      "description": "古の竜を倒してください",
      "status": "available",
      "reward": "10000G + 竜の鱗",
      "difficulty": "S",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "acceptedBy": null,
      "mdFilePath": "/data/quests/quest-001.md"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### クエスト詳細取得

特定のクエストの詳細情報を取得します。

```http
GET /api/quests/:id
```

#### パスパラメータ
- `id` - クエストID

#### 成功レスポンス (200 OK)
```json
{
  "id": "quest-001",
  "title": "ドラゴン討伐",
  "description": "古の竜を倒してください",
  "status": "available",
  "reward": "10000G + 竜の鱗",
  "difficulty": "S",
  "content": "# ドラゴン討伐\n\n## 依頼内容\n...",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "createdBy": "admin-001",
  "acceptedBy": null,
  "completedAt": null
}
```

### クエスト作成 (管理者のみ)

新しいクエストを作成します。

```http
POST /api/quests
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "title": "ゴブリン退治",
  "description": "村を襲うゴブリンを退治してください",
  "reward": "500G",
  "difficulty": "E"
}
```

#### リクエストボディ
| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| title | string | ✅ | クエストタイトル（100文字以内） |
| description | string | ✅ | クエスト説明（1000文字以内） |
| reward | string | ✅ | 報酬 |
| difficulty | string | ✅ | 難易度 (E,D,C,B,A,S,SS) |

#### 成功レスポンス (201 Created)
```json
{
  "id": "quest-new-001",
  "title": "ゴブリン退治",
  "description": "村を襲うゴブリンを退治してください",
  "status": "available",
  "reward": "500G",
  "difficulty": "E",
  "createdAt": "2025-01-15T10:00:00Z",
  "createdBy": "admin-001"
}
```

### クエスト更新 (管理者のみ)

既存のクエストを更新します。

```http
PUT /api/quests/:id
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "title": "ゴブリンの群れ退治",
  "reward": "800G"
}
```

#### 更新可能フィールド
- title
- description
- reward
- difficulty

### クエスト削除 (管理者のみ)

クエストを削除します。

```http
DELETE /api/quests/:id
Authorization: Bearer <admin-jwt-token>
```

#### 成功レスポンス (200 OK)
```json
{
  "message": "クエストを削除しました"
}
```

### クエスト受注

クエストを受注します。

```http
POST /api/quests/:id/accept
Authorization: Bearer <jwt-token>
```

#### 成功レスポンス (200 OK)
```json
{
  "id": "quest-001",
  "title": "ドラゴン討伐",
  "status": "in_progress",
  "acceptedBy": "user-123",
  "acceptedAt": "2025-01-15T12:00:00Z"
}
```

#### エラーケース
- `400 Bad Request` - 既に受注されているクエスト
- `401 Unauthorized` - 認証なし
- `404 Not Found` - クエストが存在しない

### クエスト完了

受注中のクエストを完了します。

```http
POST /api/quests/:id/complete
Authorization: Bearer <jwt-token>
```

#### 成功レスポンス (200 OK)
```json
{
  "id": "quest-001",
  "title": "ドラゴン討伐",
  "status": "completed",
  "completedAt": "2025-01-15T18:00:00Z"
}
```

#### エラーケース
- `403 Forbidden` - 自分が受注していないクエスト
- `404 Not Found` - クエストが存在しない

### 完了クエスト一覧

完了したクエストの履歴を取得します。

```http
GET /api/quests/completed?userId=user-123
```

#### クエリパラメータ
- `userId` (optional) - 特定ユーザーの履歴のみ取得

#### 成功レスポンス (200 OK)
```json
[
  {
    "id": "quest-001",
    "title": "ドラゴン討伐",
    "status": "completed",
    "reward": "10000G",
    "difficulty": "S",
    "completedAt": "2025-01-15T18:00:00Z",
    "acceptedBy": "user-123"
  }
]
```

## 🔌 WebSocket イベント

### 接続

```javascript
const socket = io('http://localhost:3001');
```

### イベント一覧

#### questUpdate
クエストの状態が変更された時に発火します。

```javascript
socket.on('questUpdate', (data) => {
  console.log(data);
  // {
  //   type: 'created' | 'updated' | 'deleted' | 'accepted' | 'completed',
  //   quest: { /* クエストデータ */ },
  //   timestamp: '2025-01-15T12:00:00Z'
  // }
});
```

## 🔒 エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| AUTH_REQUIRED | 401 | 認証が必要です |
| INVALID_TOKEN | 401 | 無効なトークンです |
| FORBIDDEN | 403 | 権限がありません |
| NOT_FOUND | 404 | リソースが見つかりません |
| VALIDATION_ERROR | 400 | 入力値が不正です |
| ALREADY_EXISTS | 409 | 既に存在します |
| SERVER_ERROR | 500 | サーバーエラー |

## 📊 レート制限

- 認証なし: 100リクエスト/時
- 認証あり: 1000リクエスト/時
- 管理者: 無制限

## 🧪 テスト用エンドポイント

開発環境でのみ利用可能：

```http
GET /api/test/health
```

レスポンス:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

<p align="center">
  API仕様についての質問は <a href="mailto:api@questboard.com">api@questboard.com</a> まで
</p>