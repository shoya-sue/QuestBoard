#!/usr/bin/env node

/**
 * Quest Board Backend Build Script
 * Node.jsプロジェクトの本番環境用ビルドスクリプト
 */

const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

async function build() {
  try {
    console.log('🏗️  Building Quest Board Backend...');
    
    // 1. distディレクトリをクリーンアップ
    console.log('📁 Cleaning dist directory...');
    await fs.remove(distDir);
    await fs.ensureDir(distDir);
    
    // 2. ソースファイルをdistにコピー
    console.log('📋 Copying source files...');
    await fs.copy(srcDir, distDir, {
      filter: (src) => {
        // テストファイルとnode_modulesを除外
        return !src.includes('__tests__') && 
               !src.includes('test.js') && 
               !src.includes('node_modules');
      }
    });
    
    // 3. package.jsonの必要な部分をコピー
    console.log('📦 Copying package metadata...');
    const packageJson = await fs.readJson(path.join(__dirname, 'package.json'));
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'app.js',
      scripts: {
        start: 'node app.js'
      },
      dependencies: packageJson.dependencies,
      engines: packageJson.engines
    };
    
    await fs.writeJson(path.join(distDir, 'package.json'), prodPackageJson, {
      spaces: 2
    });
    
    // 4. 環境変数テンプレートをコピー
    const envExamplePath = path.join(__dirname, '.env.example');
    if (await fs.pathExists(envExamplePath)) {
      console.log('🔧 Copying .env.example...');
      await fs.copy(envExamplePath, path.join(distDir, '.env.example'));
    }
    
    // 5. 必要な設定ファイルをコピー
    const configFiles = ['.env.example', 'swagger.json'];
    for (const file of configFiles) {
      const filePath = path.join(__dirname, file);
      if (await fs.pathExists(filePath)) {
        await fs.copy(filePath, path.join(distDir, file));
      }
    }
    
    // 6. ビルド情報を生成
    const buildInfo = {
      buildDate: new Date().toISOString(),
      version: packageJson.version,
      nodeVersion: process.version,
      environment: 'production'
    };
    
    await fs.writeJson(path.join(distDir, 'build-info.json'), buildInfo, {
      spaces: 2
    });
    
    // 7. ファイルサイズを計算
    const distSize = await getDirSize(distDir);
    
    console.log('✅ Build completed successfully!');
    console.log(`📊 Build size: ${(distSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📍 Output directory: ${distDir}`);
    console.log('');
    console.log('🚀 To run the built application:');
    console.log('   cd dist && npm install --production && npm start');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// ディレクトリサイズ計算
async function getDirSize(dirPath) {
  let totalSize = 0;
  
  async function calculateSize(currentPath) {
    const stats = await fs.stat(currentPath);
    
    if (stats.isDirectory()) {
      const files = await fs.readdir(currentPath);
      for (const file of files) {
        await calculateSize(path.join(currentPath, file));
      }
    } else {
      totalSize += stats.size;
    }
  }
  
  await calculateSize(dirPath);
  return totalSize;
}

// スクリプト実行
if (require.main === module) {
  build();
}

module.exports = { build };