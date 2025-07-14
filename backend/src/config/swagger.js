const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Swagger定義のベース情報
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Quest Board API',
    version: '1.0.0',
    description: `
# Quest Board API 仕様書

Quest Board は RPG風のクエスト管理システムのAPIです。

## 主な機能
- **認証システム**: Google OAuth 2.0 + JWT
- **クエスト管理**: CRUD操作、ステータス管理
- **ユーザー管理**: プロフィール、権限管理
- **リアルタイム通知**: WebSocket連携
- **2要素認証**: TOTP対応

## 認証について
ほとんどのAPIエンドポイントでは認証が必要です。
認証にはJWTトークンを使用し、Authorization ヘッダーに \`Bearer <token>\` の形式で送信してください。

## エラーレスポンス
すべてのエラーレスポンスは以下の形式で返されます：
\`\`\`json
{
  "error": "エラーメッセージ",
  "details": ["詳細なエラー情報（オプション）"]
}
\`\`\`

## ページネーション
一覧取得系のAPIでは以下のクエリパラメータでページネーションが可能です：
- \`page\`: ページ番号（デフォルト: 1）
- \`limit\`: 1ページあたりのアイテム数（デフォルト: 10）
    `,
    contact: {
      name: 'Quest Board Team',
      email: 'support@questboard.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001/api',
      description: 'Development server'
    },
    {
      url: 'https://api.questboard.com/api',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT認証トークン'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'エラーメッセージ'
          },
          details: {
            type: 'array',
            items: { type: 'string' },
            description: '詳細なエラー情報（オプション）'
          }
        },
        required: ['error']
      },
      Pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: '総アイテム数'
          },
          page: {
            type: 'integer',
            description: '現在のページ番号'
          },
          limit: {
            type: 'integer',
            description: '1ページあたりのアイテム数'
          },
          totalPages: {
            type: 'integer',
            description: '総ページ数'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ユーザーID'
          },
          username: {
            type: 'string',
            description: 'ユーザー名'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'メールアドレス'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            description: 'ユーザーロール'
          },
          level: {
            type: 'integer',
            description: 'ユーザーレベル'
          },
          experience: {
            type: 'integer',
            description: '経験値'
          },
          points: {
            type: 'integer',
            description: 'ポイント'
          },
          profilePicture: {
            type: 'string',
            format: 'url',
            description: 'プロフィール画像URL'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '作成日時'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: '更新日時'
          }
        }
      },
      Quest: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'クエストID'
          },
          title: {
            type: 'string',
            description: 'クエストタイトル'
          },
          description: {
            type: 'string',
            description: 'クエストの説明'
          },
          content: {
            type: 'string',
            description: 'クエストのMarkdownコンテンツ'
          },
          status: {
            type: 'string',
            enum: ['available', 'in_progress', 'completed'],
            description: 'クエストステータス'
          },
          reward: {
            type: 'string',
            description: '報酬'
          },
          rewardPoints: {
            type: 'integer',
            description: '報酬ポイント'
          },
          difficulty: {
            type: 'string',
            enum: ['E', 'D', 'C', 'B', 'A', 'S', 'SS'],
            description: '難易度'
          },
          category: {
            type: 'string',
            description: 'カテゴリ'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'タグ'
          },
          maxParticipants: {
            type: 'integer',
            description: '最大参加者数'
          },
          currentParticipants: {
            type: 'integer',
            description: '現在の参加者数'
          },
          deadline: {
            type: 'string',
            format: 'date-time',
            description: '締切日時'
          },
          imageUrl: {
            type: 'string',
            format: 'url',
            description: 'クエスト画像URL'
          },
          createdBy: {
            type: 'string',
            format: 'uuid',
            description: '作成者ID'
          },
          acceptedBy: {
            type: 'string',
            format: 'uuid',
            description: '受注者ID'
          },
          acceptedAt: {
            type: 'string',
            format: 'date-time',
            description: '受注日時'
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            description: '完了日時'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '作成日時'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: '更新日時'
          }
        }
      },
      QuestHistory: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '履歴ID'
          },
          questId: {
            type: 'string',
            format: 'uuid',
            description: 'クエストID'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ユーザーID'
          },
          action: {
            type: 'string',
            enum: ['created', 'accepted', 'completed', 'updated', 'deleted'],
            description: 'アクション'
          },
          details: {
            type: 'object',
            description: 'アクションの詳細情報'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '実行日時'
          }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '通知ID'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ユーザーID'
          },
          type: {
            type: 'string',
            enum: ['quest_created', 'quest_accepted', 'quest_completed', 'level_up', 'achievement_unlocked', 'info'],
            description: '通知タイプ'
          },
          title: {
            type: 'string',
            description: '通知タイトル'
          },
          message: {
            type: 'string',
            description: '通知メッセージ'
          },
          data: {
            type: 'object',
            description: '通知に関連するデータ'
          },
          read: {
            type: 'boolean',
            description: '既読フラグ'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '作成日時'
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: '認証が必要です',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: '認証が必要です'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'アクセスが拒否されました',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'アクセスが拒否されました'
            }
          }
        }
      },
      NotFoundError: {
        description: 'リソースが見つかりません',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'リソースが見つかりません'
            }
          }
        }
      },
      ValidationError: {
        description: 'バリデーションエラー',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'バリデーションエラー',
              details: ['タイトルは必須です', '説明は1000文字以下である必要があります']
            }
          }
        }
      },
      InternalServerError: {
        description: 'サーバーエラー',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'サーバーエラーが発生しました'
            }
          }
        }
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'ページ番号',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: '1ページあたりのアイテム数',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        }
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: '検索キーワード',
        required: false,
        schema: {
          type: 'string'
        }
      },
      DifficultyParam: {
        name: 'difficulty',
        in: 'query',
        description: '難易度フィルター',
        required: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['E', 'D', 'C', 'B', 'A', 'S', 'SS']
          }
        }
      },
      StatusParam: {
        name: 'status',
        in: 'query',
        description: 'ステータスフィルター',
        required: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['available', 'in_progress', 'completed']
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: '認証関連のAPI'
    },
    {
      name: 'Users',
      description: 'ユーザー管理API'
    },
    {
      name: 'Quests',
      description: 'クエスト管理API'
    },
    {
      name: 'Notifications',
      description: '通知関連API'
    },
    {
      name: '2FA',
      description: '2要素認証API'
    },
    {
      name: 'Search',
      description: '検索API'
    }
  ]
};

// Swagger設定オプション
const options = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../models/*.js'),
    path.join(__dirname, '../middleware/*.js'),
    path.join(__dirname, './swagger-docs/*.yaml')
  ]
};

// SwaggerJSDoc仕様を生成
const swaggerSpec = swaggerJSDoc(options);

// Swagger UI設定
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { background-color: #2196f3; }
    .swagger-ui .topbar .download-url-wrapper input[type=text] { border: 1px solid #ccc; }
    .swagger-ui .info .title { color: #2196f3; }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Quest Board API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list'
  }
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};