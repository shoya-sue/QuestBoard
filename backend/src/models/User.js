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
  };

  return User;
};