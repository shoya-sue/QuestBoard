module.exports = (sequelize, DataTypes) => {
  const Achievement = sequelize.define('Achievement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.ENUM('quest', 'social', 'exploration', 'special'),
      defaultValue: 'quest',
    },
    rarity: {
      type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
      defaultValue: 'common',
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    requirements: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Conditions to unlock this achievement',
    },
    rewards: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Rewards for completing this achievement',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'achievements',
    underscored: true,
  });

  Achievement.associate = (models) => {
    Achievement.hasMany(models.UserAchievement, {
      foreignKey: 'achievement_id',
      as: 'userAchievements',
    });
  };

  return Achievement;
};