const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

const db = {};

// モデルの定義
db.User = require('./User')(sequelize, DataTypes);
db.Quest = require('./Quest')(sequelize, DataTypes);
db.QuestHistory = require('./QuestHistory')(sequelize, DataTypes);
db.Achievement = require('./Achievement')(sequelize, DataTypes);
db.UserAchievement = require('./UserAchievement')(sequelize, DataTypes);
db.Notification = require('./Notification')(sequelize, DataTypes);

// アソシエーションの設定
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;