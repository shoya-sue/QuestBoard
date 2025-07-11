require('dotenv').config();
const userService = require('../services/userService');

async function createAdmin() {
  try {
    const username = process.argv[2];
    const password = process.argv[3];
    
    if (!username || !password) {
      console.log('使用方法: node createAdmin.js <username> <password>');
      process.exit(1);
    }
    
    const user = await userService.createUser(username, password, 'admin');
    console.log('管理者ユーザーを作成しました:', user);
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

createAdmin();