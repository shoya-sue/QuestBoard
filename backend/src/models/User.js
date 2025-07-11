module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      field: 'google_id',
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    profilePicture: {
      type: DataTypes.STRING,
      field: 'profile_picture',
    },
    bio: {
      type: DataTypes.TEXT,
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        notifications: true,
        theme: 'light',
        language: 'ja',
      },
    },
    emailNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'email_notifications',
    },
    notificationTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ['quest_created', 'quest_accepted', 'quest_completed', 'level_up', 'achievement_unlocked'],
      field: 'notification_types',
    },
    locale: {
      type: DataTypes.STRING,
      defaultValue: 'ja',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at',
    },
  }, {
    tableName: 'users',
    underscored: true,
  });

  User.associate = (models) => {
    User.hasMany(models.Quest, {
      foreignKey: 'created_by',
      as: 'createdQuests',
    });
    User.hasMany(models.QuestHistory, {
      foreignKey: 'user_id',
      as: 'questHistory',
    });
    User.hasMany(models.UserAchievement, {
      foreignKey: 'user_id',
      as: 'achievements',
    });
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
    });
  };

  return User;
};