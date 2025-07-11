module.exports = (sequelize, DataTypes) => {
  const QuestHistory = sequelize.define('QuestHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    questId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quest_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    action: {
      type: DataTypes.ENUM('accepted', 'completed', 'abandoned', 'failed'),
      allowNull: false,
    },
    earnedPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'earned_points',
    },
    earnedExperience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'earned_experience',
    },
    completionTime: {
      type: DataTypes.INTEGER,
      field: 'completion_time',
      comment: 'Time in seconds to complete the quest',
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'quest_history',
    underscored: true,
  });

  QuestHistory.associate = (models) => {
    QuestHistory.belongsTo(models.Quest, {
      foreignKey: 'quest_id',
      as: 'quest',
    });
    QuestHistory.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return QuestHistory;
};