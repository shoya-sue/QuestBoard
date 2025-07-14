const express = require('express');
const router = express.Router();
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('../config/swagger');

/**
 * @swagger
 * /docs:
 *   get:
 *     tags: [Documentation]
 *     summary: API仕様書
 *     description: Swagger UIによるインタラクティブなAPI仕様書
 *     security: []
 *     responses:
 *       200:
 *         description: API仕様書を表示
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */

// Swagger UI エンドポイント
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// JSON形式のスキーマ取得
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// YAML形式のスキーマ取得（オプション）
router.get('/yaml', (req, res) => {
  const yaml = require('js-yaml');
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml.dump(swaggerSpec));
});

// ReDoc形式のドキュメント（オプション）
router.get('/redoc', (req, res) => {
  const redocHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quest Board API Documentation - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <redoc spec-url="/api/docs/json"></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `;
  res.send(redocHtml);
});

// API統計情報
router.get('/stats', (req, res) => {
  const stats = {
    totalEndpoints: 0,
    endpointsByTag: {},
    endpointsByMethod: {},
    schemasCount: 0,
    lastUpdated: new Date().toISOString()
  };

  // パスを解析してエンドポイント統計を生成
  if (swaggerSpec.paths) {
    Object.keys(swaggerSpec.paths).forEach(path => {
      Object.keys(swaggerSpec.paths[path]).forEach(method => {
        if (method !== 'parameters') {
          stats.totalEndpoints++;
          
          // メソッド別カウント
          stats.endpointsByMethod[method.toUpperCase()] = 
            (stats.endpointsByMethod[method.toUpperCase()] || 0) + 1;
          
          // タグ別カウント
          const tags = swaggerSpec.paths[path][method].tags || ['Untagged'];
          tags.forEach(tag => {
            stats.endpointsByTag[tag] = (stats.endpointsByTag[tag] || 0) + 1;
          });
        }
      });
    });
  }

  // スキーマ数
  if (swaggerSpec.components && swaggerSpec.components.schemas) {
    stats.schemasCount = Object.keys(swaggerSpec.components.schemas).length;
  }

  res.json(stats);
});

// ヘルスチェック用エンドポイント
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    documentation: {
      swagger: '/api/docs',
      redoc: '/api/docs/redoc',
      json: '/api/docs/json',
      yaml: '/api/docs/yaml'
    }
  });
});

module.exports = router;