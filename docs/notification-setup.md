# メール通知システムセットアップガイド

## 概要

Quest Boardにメール通知とアプリ内通知機能が実装されました。この機能により、ユーザーは重要なイベントをリアルタイムで受け取ることができます。

## 機能

### 通知の種類

1. **クエスト関連**
   - 新しいクエストの作成通知
   - クエストの受理通知
   - クエストの完了通知

2. **ユーザー関連**
   - レベルアップ通知
   - 実績達成通知

3. **定期通知**
   - 週次ダイジェスト（今後実装予定）

### 通知チャンネル

- **アプリ内通知**: リアルタイムでブラウザに表示
- **メール通知**: 登録メールアドレスに送信
- **ブラウザ通知**: デスクトップ通知（許可が必要）

## セットアップ

### 1. メールサーバーの設定

`.env`ファイルに以下を追加:

```env
# メール設定
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Quest Board <noreply@questboard.com>
```

#### Gmail を使用する場合

1. [Googleアカウント設定](https://myaccount.google.com/security)にアクセス
2. 2段階認証を有効化
3. アプリパスワードを生成
4. 生成されたパスワードを`EMAIL_PASSWORD`に設定

#### その他のメールサービス

- **SendGrid**: 
  ```env
  EMAIL_HOST=smtp.sendgrid.net
  EMAIL_PORT=587
  EMAIL_USER=apikey
  EMAIL_PASSWORD=your-sendgrid-api-key
  ```

- **AWS SES**:
  ```env
  EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
  EMAIL_PORT=587
  EMAIL_USER=your-ses-smtp-username
  EMAIL_PASSWORD=your-ses-smtp-password
  ```

### 2. データベースマイグレーション

通知テーブルを作成:

```bash
cd backend
npm run migrate
```

### 3. フロントエンド設定

ブラウザ通知を有効にするため、ユーザーに許可を求めます:

```javascript
// 自動的に実装済み
// 通知ベルアイコンをクリック時に許可を求める
```

## 使用方法

### ユーザー向け機能

1. **通知センター**
   - ヘッダーのベルアイコンをクリックして通知を確認
   - 未読通知数がバッジで表示
   - 通知をクリックで既読にマーク

2. **通知設定**
   - `/settings/notifications`から設定変更
   - メール通知のON/OFF
   - 通知タイプごとの設定

### API

#### 通知一覧取得
```bash
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

#### 未読数取得
```bash
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### 既読にする
```bash
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### すべて既読にする
```bash
PUT /api/notifications/mark-all-read
Authorization: Bearer <token>
```

#### 通知設定更新
```bash
PUT /api/notifications/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "emailNotifications": true,
  "notificationTypes": ["quest_created", "quest_completed", "level_up"]
}
```

## カスタマイズ

### メールテンプレート

メールテンプレートは`backend/src/templates/emails/`に配置:

```
templates/emails/
├── quest-created/
│   ├── html.pug
│   ├── text.pug
│   └── subject.pug
├── quest-completed/
│   ├── html.pug
│   ├── text.pug
│   └── subject.pug
└── ...
```

### 新しい通知タイプの追加

1. **Notificationモデルを更新**
   ```javascript
   // backend/src/models/Notification.js
   type: DataTypes.ENUM(
     // ... 既存のタイプ
     'your_new_type'
   )
   ```

2. **通知サービスにメソッド追加**
   ```javascript
   // backend/src/services/notification.js
   async notifyYourEvent(data) {
     await this.createNotification({
       userId: data.userId,
       type: 'your_new_type',
       title: 'タイトル',
       message: 'メッセージ'
     });
   }
   ```

3. **メールテンプレート作成**
   ```
   backend/src/templates/emails/your-event/
   ├── html.pug
   ├── text.pug
   └── subject.pug
   ```

## トラブルシューティング

### メールが送信されない

1. **SMTP設定を確認**
   ```bash
   # テストメール送信
   curl -X POST http://localhost:3001/api/notifications/test \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json"
   ```

2. **ログを確認**
   - メール送信エラーはコンソールに出力
   - Sentryにもエラーが記録される

3. **ファイアウォール設定**
   - ポート587（または設定したポート）が開いているか確認

### 通知が表示されない

1. **ブラウザ設定**
   - 通知許可が有効か確認
   - サイトの通知設定を確認

2. **WebSocket接続**
   - 開発者ツールのNetworkタブでWebSocket接続を確認
   - `socket.io`の接続状態を確認

### パフォーマンス最適化

1. **バッチ送信**
   ```javascript
   // 大量の通知を送る場合はキューを使用
   // 今後Bull Queueなどの実装を検討
   ```

2. **通知の集約**
   - 同じユーザーへの通知を一定時間内で集約
   - ダイジェスト形式での送信

## セキュリティ

1. **レート制限**
   - 通知APIにレート制限を実装（今後）
   - スパム防止

2. **認証**
   - すべての通知APIは認証が必要
   - JWTトークンによる認証

3. **プライバシー**
   - メールアドレスの暗号化保存
   - 通知内容の最小化

## 監視

1. **メトリクス**
   - 送信成功/失敗数
   - 配信遅延
   - エラー率

2. **アラート**
   - メール送信失敗率が閾値を超えた場合
   - WebSocket接続エラー

## 今後の拡張予定

1. **プッシュ通知**
   - Service Workerを使用したプッシュ通知
   - モバイルアプリ対応

2. **通知テンプレート**
   - カスタマイズ可能な通知テンプレート
   - 多言語対応

3. **高度な配信制御**
   - 配信時間の最適化
   - ユーザーのタイムゾーン対応
   - 通知の優先度設定