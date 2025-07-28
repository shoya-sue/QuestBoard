const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const backupService = require('../services/backupService');
const { Logger: logger } = require('../utils/logger');
const { updateQuestMetrics } = require('../utils/metrics');
const db = require('../models');

// 管理者のみアクセス可能
router.use(authenticateToken);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/backup:
 *   post:
 *     summary: Create backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, incremental]
 *                 default: full
 *     responses:
 *       200:
 *         description: Backup created successfully
 *       403:
 *         description: Unauthorized
 */
router.post('/backup', async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    
    logger.info(`Admin ${req.user.email} initiated ${type} backup`);
    
    const result = await backupService.createBackup(type);
    
    res.json({
      success: true,
      message: `${type} backup created successfully`,
      backup: result.backup
    });
    
  } catch (error) {
    logger.error('Backup creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

/**
 * @swagger
 * /api/admin/backup/status:
 *   get:
 *     summary: Get backup status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup status
 */
router.get('/backup/status', async (req, res) => {
  try {
    const status = await backupService.getBackupStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({
      error: 'Failed to get backup status'
    });
  }
});

/**
 * @swagger
 * /api/admin/backup/restore:
 *   post:
 *     summary: Restore from backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               backupFile:
 *                 type: string
 *                 description: Path to backup file
 *     responses:
 *       200:
 *         description: Restore completed
 */
router.post('/backup/restore', async (req, res) => {
  try {
    const { backupFile } = req.body;
    
    if (!backupFile) {
      return res.status(400).json({
        error: 'Backup file path is required'
      });
    }
    
    logger.warn(`Admin ${req.user.email} initiated restore from ${backupFile}`);
    
    const result = await backupService.restoreBackup(backupFile);
    
    res.json({
      success: true,
      message: 'Restore completed successfully'
    });
    
  } catch (error) {
    logger.error('Restore failed:', error);
    res.status(500).json({
      error: 'Failed to restore backup'
    });
  }
});

/**
 * @swagger
 * /api/admin/backup/download-url:
 *   post:
 *     summary: Generate download URL for backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               backupPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Download URL generated
 */
router.post('/backup/download-url', async (req, res) => {
  try {
    const { backupPath } = req.body;
    
    const urlInfo = await backupService.generateDownloadUrl(backupPath);
    
    res.json({
      success: true,
      ...urlInfo
    });
    
  } catch (error) {
    logger.error('Failed to generate download URL:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    // データベース統計
    const userCount = await db.User.count();
    const questCount = await db.Quest.count();
    const activeQuestCount = await db.Quest.count({ where: { status: 'active' } });
    const completedQuestCount = await db.QuestHistory.count({ where: { status: 'completed' } });
    
    // クエストメトリクスの更新
    await updateQuestMetrics(db);
    
    res.json({
      users: {
        total: userCount,
        active: await db.User.count({
          where: {
            lastActive: {
              [db.Sequelize.Op.gte]: new Date(Date.now() - 30 * 60 * 1000)
            }
          }
        })
      },
      quests: {
        total: questCount,
        active: activeQuestCount,
        completed: completedQuestCount
      },
      database: {
        size: await this.getDatabaseSize(),
        connections: await this.getDatabaseConnections()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics'
    });
  }
});

/**
 * @swagger
 * /api/admin/health/{service}:
 *   get:
 *     summary: Check service health
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [database, redis, elasticsearch]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health/:service', async (req, res) => {
  try {
    const { service } = req.params;
    let health = { service, status: 'unknown' };
    
    switch (service) {
      case 'database':
        await db.sequelize.authenticate();
        health.status = 'healthy';
        break;
        
      case 'redis':
        const redis = require('../config/redis');
        await redis.ping();
        health.status = 'healthy';
        break;
        
      case 'elasticsearch':
        const { client: esClient } = require('../config/elasticsearch');
        const esHealth = await esClient.cluster.health();
        health.status = esHealth.status;
        health.details = esHealth;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid service' });
    }
    
    res.json(health);
    
  } catch (error) {
    res.json({
      service: req.params.service,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get application logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Application logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    const fs = require('fs').promises;
    const path = require('path');
    
    // ログファイルのパス
    const logFile = path.join(__dirname, '../../logs/app.log');
    
    // ログファイルを読み込む
    const logContent = await fs.readFile(logFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    
    // レベルでフィルタリング
    const filteredLogs = lines
      .filter(line => line.includes(`[${level.toUpperCase()}]`))
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      });
    
    res.json({
      logs: filteredLogs,
      count: filteredLogs.length
    });
    
  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({
      error: 'Failed to get logs'
    });
  }
});

// ヘルパー関数
router.getDatabaseSize = async function() {
  try {
    const result = await db.sequelize.query(
      "SELECT pg_database_size(current_database()) as size",
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    return result[0].size;
  } catch (error) {
    return null;
  }
};

router.getDatabaseConnections = async function() {
  try {
    const result = await db.sequelize.query(
      "SELECT count(*) as connections FROM pg_stat_activity",
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    return result[0].connections;
  } catch (error) {
    return null;
  }
};

module.exports = router;