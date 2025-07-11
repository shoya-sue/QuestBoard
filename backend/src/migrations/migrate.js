#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('../models');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // データベース接続確認
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // マイグレーションファイルを取得
    const migrationsDir = path.join(__dirname);
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js') && f !== 'migrate.js')
      .sort();
    
    // 各マイグレーションを実行
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      
      if (migration.up) {
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        console.log(`✓ ${file} completed`);
      }
    }
    
    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// 実行
runMigrations();