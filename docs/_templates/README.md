# ドキュメントテンプレート

新しいドキュメントを作成する際に使用するテンプレート集です。

## 利用可能なテンプレート

### [ガイドテンプレート](guide-template.md)
実践的なガイドやチュートリアルを作成する際に使用します。
- 使用場面: セットアップガイド、操作手順、開発ガイドなど
- 配置場所: `docs/02-guides/` または適切なカテゴリ

### [APIエンドポイントテンプレート](api-endpoint-template.md)
API仕様書を作成する際に使用します。
- 使用場面: REST APIの詳細仕様書
- 配置場所: `docs/03-api/`

### [レポートテンプレート](report-template.md)
検証レポートや実装レポートを作成する際に使用します。
- 使用場面: 検証結果、実装サマリー、分析レポート
- 配置場所: `docs/reports/verification/` または `docs/reports/implementation/`

## テンプレートの使用方法

1. 適切なテンプレートをコピー
2. ファイル名を適切な命名規則に従って変更
3. メタデータ（title, author, tags）を更新
4. 内容を実際の情報に置き換え
5. 適切なディレクトリに配置

## 命名規則

- **ガイド**: `descriptive-name.md`
- **API**: `endpoint-name-api.md`
- **レポート**: `YYYY-MM-DD-descriptive-name.md`

## メタデータガイドライン

すべてのドキュメントには以下のYAMLフロントマターを含めてください：

```yaml
---
title: 適切なタイトル
version: 1.0.0
lastUpdated: YYYY-MM-DD
author: 作成者名
tags: [category, relevant, tags]
---
```