module.exports = (sequelize, DataTypes) => {
  const Quest = sequelize.define('Quest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000],
      },
    },
    content: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM('available', 'in_progress', 'completed'),
      defaultValue: 'available',
    },
    reward: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rewardPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'reward_points',
    },
    difficulty: {
      type: DataTypes.ENUM('E', 'D', 'C', 'B', 'A', 'S', 'SS'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'max_participants',
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_participants',
    },
    deadline: {
      type: DataTypes.DATE,
    },
    requirements: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url',
    },
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by',
    },
    acceptedBy: {
      type: DataTypes.UUID,
      field: 'accepted_by',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      field: 'accepted_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
    },
  }, {
    tableName: 'quests',
    underscored: true,
  });

  Quest.associate = (models) => {
    Quest.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
    Quest.belongsTo(models.User, {
      foreignKey: 'accepted_by',
      as: 'acceptor',
    });
    Quest.hasMany(models.QuestHistory, {
      foreignKey: 'quest_id',
      as: 'history',
    });
  };

  return Quest;
};