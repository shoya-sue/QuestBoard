module.exports = (sequelize, DataTypes) => {
  const UserAchievement = sequelize.define('UserAchievement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    achievementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'achievement_id',
    },
    unlockedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'unlocked_at',
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Progress percentage (0-100)',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'user_achievements',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'achievement_id'],
      },
    ],
  });

  UserAchievement.associate = (models) => {
    UserAchievement.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    UserAchievement.belongsTo(models.Achievement, {
      foreignKey: 'achievement_id',
      as: 'achievement',
    });
  };

  return UserAchievement;
};