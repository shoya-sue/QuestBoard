---
title: Elasticsearch検索機能セットアップガイド
version: 1.0.0
lastUpdated: 2025-07-28
author: 開発チーム
tags: [guides, elasticsearch, search, setup, full-text-search]
---

# Elasticsearch検索機能セットアップガイド

## 概要

Quest BoardにElasticsearchを使用した高度な検索機能が実装されました。この機能により、クエストとユーザーの高速な全文検索、自動補完、フィルタリングが可能になります。

## 機能

- **全文検索**: クエストのタイトルと説明文を対象とした高速検索
- **日本語対応**: Kuromojiアナライザーによる日本語の形態素解析
- **ファジー検索**: タイポや表記ゆれに対応
- **自動補完**: 入力中にリアルタイムでサジェスト表示
- **フィルタリング**: カテゴリ、難易度、ステータスでの絞り込み
- **ソート機能**: 関連度、新着順、報酬順、難易度順でのソート
- **フォールバック**: Elasticsearchが利用できない場合はPostgreSQLで検索

## セットアップ

### 1. Elasticsearchのインストール

#### Docker経由（推奨）
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### 直接インストール
[公式サイト](https://www.elastic.co/downloads/elasticsearch)からダウンロードしてインストール

### 2. 環境変数の設定

`.env`ファイルに以下を追加:

```env
# Elasticsearch設定
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### 3. インデックスの作成と既存データの移行

```bash
cd backend
npm run reindex
```

これにより:
- 必要なインデックスが自動作成されます
- 既存のクエストとユーザーデータがElasticsearchに登録されます

## 使用方法

### フロントエンド

検索バーが自動的に表示され、以下の機能が利用可能です:

1. **テキスト検索**: 検索ボックスにキーワードを入力
2. **自動補完**: 2文字以上入力すると候補が表示
3. **フィルター**: カテゴリ、難易度、ステータスで絞り込み
4. **ソート**: 検索結果の並び替え

### API

#### クエスト検索
```bash
GET /api/search/quests?q=キーワード&category=development&difficulty=easy&status=open&sortBy=relevance&page=1&limit=20
```

#### ユーザー検索（認証必要）
```bash
GET /api/search/users?q=ユーザー名&page=1&limit=20
```

#### 自動補完
```bash
GET /api/search/suggestions?q=キー&type=quest
```

## トラブルシューティング

### Elasticsearchに接続できない場合

1. Elasticsearchが起動しているか確認:
   ```bash
   curl http://localhost:9200
   ```

2. ログを確認:
   ```bash
   docker logs elasticsearch
   ```

3. メモリ不足の場合:
   ```bash
   # Docker Desktop のメモリ割り当てを増やす
   # または以下のコマンドで制限付きで起動
   docker run -d \
     --name elasticsearch \
     -p 9200:9200 \
     -e "discovery.type=single-node" \
     -e "xpack.security.enabled=false" \
     -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
     docker.elastic.co/elasticsearch/elasticsearch:8.11.0
   ```

### 検索結果が表示されない場合

1. インデックスの再作成:
   ```bash
   npm run reindex
   ```

2. Elasticsearchのヘルスチェック:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

3. インデックスの確認:
   ```bash
   curl http://localhost:9200/_cat/indices
   ```

## パフォーマンス最適化

### キャッシュの活用

Redisキャッシュと連携して、頻繁にアクセスされる検索結果をキャッシュ:

```javascript
// 自動的に有効化されています
// キャッシュTTL: 5分
```

### インデックスの最適化

定期的なインデックスの最適化:

```bash
curl -X POST "localhost:9200/quests/_forcemerge?max_num_segments=1"
```

## セキュリティ

本番環境では以下の設定を推奨:

1. Elasticsearchの認証を有効化
2. HTTPSの使用
3. ファイアウォールでポート9200を制限
4. 定期的なバックアップ

## 監視

Elasticsearchの状態を監視:

```bash
# クラスタヘルス
curl http://localhost:9200/_cluster/health

# ノード情報
curl http://localhost:9200/_nodes/stats

# インデックス統計
curl http://localhost:9200/quests/_stats
```