const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const { Logger: logger } = require('../utils/logger');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupScript = path.join(__dirname, '../../../scripts/backup.sh');
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/questboard';
    
    // S3クライアントの初期化
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      this.s3Bucket = process.env.BACKUP_S3_BUCKET;
    }
  }

  /**
   * バックアップの実行
   */
  async createBackup(type = 'full') {
    try {
      // typeパラメータのバリデーション
      const allowedTypes = ['full', 'incremental', 'differential'];
      if (!allowedTypes.includes(type)) {
        throw new Error('Invalid backup type');
      }
      
      logger.info(`Starting ${type} backup`);
      
      const { stdout, stderr } = await execAsync(`${this.backupScript} ${type}`);
      
      if (stderr) {
        logger.error('Backup stderr:', stderr);
      }
      
      // バックアップログから結果を解析
      const backupInfo = this.parseBackupOutput(stdout);
      
      logger.info(`Backup completed: ${backupInfo.size}`, backupInfo);
      
      // バックアップ成功を記録
      await this.recordBackupHistory({
        type,
        status: 'success',
        size: backupInfo.size,
        duration: backupInfo.duration,
        files: backupInfo.files
      });
      
      return {
        success: true,
        backup: backupInfo
      };
      
    } catch (error) {
      logger.error('Backup failed:', error);
      
      // バックアップ失敗を記録
      await this.recordBackupHistory({
        type,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * バックアップからの復元
   */
  async restoreBackup(backupFile) {
    try {
      logger.info(`Starting restore from: ${backupFile}`);
      
      // 復元前の確認
      const backupExists = await this.verifyBackupFile(backupFile);
      if (!backupExists) {
        throw new Error('Backup file not found');
      }
      
      // ファイル名のサニタイズ
      const sanitizedBackupFile = path.basename(backupFile);
      if (sanitizedBackupFile !== backupFile) {
        throw new Error('Invalid backup file path');
      }
      
      const { stdout, stderr } = await execAsync(`${this.backupScript} restore "${sanitizedBackupFile}"`);
      
      if (stderr) {
        logger.error('Restore stderr:', stderr);
      }
      
      logger.info('Restore completed successfully');
      
      return {
        success: true,
        message: 'Restore completed successfully'
      };
      
    } catch (error) {
      logger.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * バックアップステータスの取得
   */
  async getBackupStatus() {
    try {
      const { stdout } = await execAsync(`${this.backupScript} status`);
      
      // ローカルバックアップ情報
      const localBackups = await this.listLocalBackups();
      
      // S3バックアップ情報
      const s3Backups = await this.listS3Backups();
      
      // バックアップ履歴
      const history = await this.getBackupHistory();
      
      return {
        local: localBackups,
        s3: s3Backups,
        history: history,
        nextScheduled: await this.getNextScheduledBackup()
      };
      
    } catch (error) {
      logger.error('Failed to get backup status:', error);
      throw error;
    }
  }

  /**
   * ローカルバックアップのリスト取得
   */
  async listLocalBackups() {
    try {
      const backups = [];
      const types = ['daily', 'weekly', 'monthly'];
      
      for (const type of types) {
        const dir = path.join(this.backupDir, type);
        
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            if (file.endsWith('.tar.gz') || file.endsWith('.tar.gz.enc')) {
              const stats = await fs.stat(path.join(dir, file));
              backups.push({
                name: file,
                type: type,
                size: this.formatBytes(stats.size),
                created: stats.mtime,
                path: path.join(dir, file)
              });
            }
          }
        } catch (error) {
          // ディレクトリが存在しない場合は無視
        }
      }
      
      return backups.sort((a, b) => b.created - a.created);
      
    } catch (error) {
      logger.error('Failed to list local backups:', error);
      return [];
    }
  }

  /**
   * S3バックアップのリスト取得
   */
  async listS3Backups() {
    if (!this.s3Client || !this.s3Bucket) {
      return [];
    }
    
    try {
      const hostname = require('os').hostname();
      const command = new ListObjectsV2Command({
        Bucket: this.s3Bucket,
        Prefix: `${hostname}/`,
        MaxKeys: 100
      });
      
      const response = await this.s3Client.send(command);
      const backups = [];
      
      if (response.Contents) {
        for (const object of response.Contents) {
          const parts = object.Key.split('/');
          if (parts.length >= 3) {
            backups.push({
              name: parts[parts.length - 1],
              type: parts[1],
              size: this.formatBytes(object.Size),
              created: object.LastModified,
              path: `s3://${this.s3Bucket}/${object.Key}`,
              key: object.Key
            });
          }
        }
      }
      
      return backups.sort((a, b) => b.created - a.created);
      
    } catch (error) {
      logger.error('Failed to list S3 backups:', error);
      return [];
    }
  }

  /**
   * バックアップファイルのダウンロードURL生成
   */
  async generateDownloadUrl(backupPath) {
    // S3バックアップの場合
    if (backupPath.startsWith('s3://')) {
      const key = backupPath.replace(`s3://${this.s3Bucket}/`, '');
      
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key
      });
      
      // 1時間有効な署名付きURL
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      
      return {
        url: url,
        expires: new Date(Date.now() + 3600 * 1000)
      };
    }
    
    // ローカルバックアップの場合（セキュリティ上の理由で直接アクセスは許可しない）
    throw new Error('Direct download of local backups is not allowed');
  }

  /**
   * バックアップ履歴の記録
   */
  async recordBackupHistory(info) {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');
      let history = [];
      
      try {
        const data = await fs.readFile(historyFile, 'utf8');
        history = JSON.parse(data);
      } catch (error) {
        // ファイルが存在しない場合は新規作成
      }
      
      history.unshift({
        ...info,
        timestamp: new Date(),
        hostname: require('os').hostname()
      });
      
      // 最新100件のみ保持
      history = history.slice(0, 100);
      
      await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
      
    } catch (error) {
      logger.error('Failed to record backup history:', error);
    }
  }

  /**
   * バックアップ履歴の取得
   */
  async getBackupHistory() {
    try {
      const historyFile = path.join(this.backupDir, 'backup-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 次回のスケジュールされたバックアップ時刻
   */
  async getNextScheduledBackup() {
    try {
      // Crontabから次回実行時刻を計算
      const { stdout } = await execAsync('crontab -l | grep questboard.*backup');
      
      if (stdout) {
        // 簡易的な実装（実際にはcron式のパーサーを使用）
        const now = new Date();
        const nextDaily = new Date(now);
        nextDaily.setDate(nextDaily.getDate() + 1);
        nextDaily.setHours(2, 0, 0, 0);
        
        return {
          type: 'full',
          scheduled: nextDaily
        };
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * バックアップファイルの検証
   */
  async verifyBackupFile(backupFile) {
    try {
      if (backupFile.startsWith('s3://')) {
        // S3ファイルの存在確認
        const key = backupFile.replace(`s3://${this.s3Bucket}/`, '');
        // S3キーのバリデーション
        if (key.includes('..') || key.startsWith('/')) {
          throw new Error('Invalid S3 key');
        }
        const command = new ListObjectsV2Command({
          Bucket: this.s3Bucket,
          Prefix: key,
          MaxKeys: 1
        });
        
        const response = await this.s3Client.send(command);
        return response.Contents && response.Contents.length > 0;
        
      } else {
        // ローカルファイルの存在確認
        // パスのバリデーション
        const normalizedPath = path.normalize(backupFile);
        const resolvedPath = path.resolve(this.backupDir, normalizedPath);
        if (!resolvedPath.startsWith(path.resolve(this.backupDir))) {
          throw new Error('Invalid backup file path');
        }
        await fs.access(resolvedPath);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * バックアップ出力の解析
   */
  parseBackupOutput(output) {
    const lines = output.split('\n');
    const info = {
      files: [],
      size: 'unknown',
      duration: 'unknown'
    };
    
    for (const line of lines) {
      // ファイルサイズの抽出
      const sizeMatch = line.match(/completed: (\S+)/);
      if (sizeMatch) {
        info.size = sizeMatch[1];
      }
      
      // バックアップファイルの抽出
      if (line.includes('.tar.gz') || line.includes('.sql.gz')) {
        const fileMatch = line.match(/([^\s]+\.(tar\.gz|sql\.gz))/);
        if (fileMatch) {
          info.files.push(fileMatch[1]);
        }
      }
    }
    
    return info;
  }

  /**
   * バイト数のフォーマット
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new BackupService();