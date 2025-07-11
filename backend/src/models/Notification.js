module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(
        'quest_created',
        'quest_accepted',
        'quest_completed',
        'quest_completed_self',
        'level_up',
        'achievement_unlocked',
        'mention',
        'system'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    relatedId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    relatedType: {
      type: DataTypes.ENUM('quest', 'user', 'achievement'),
      allowNull: true,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'read'],
      },
      {
        fields: ['userId', 'createdAt'],
      },
      {
        fields: ['relatedId', 'relatedType'],
      },
    ],
  });

  Notification.associate = function(models) {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // 既読にする際に自動的にreadAtを設定
  Notification.beforeUpdate((notification, options) => {
    if (notification.changed('read') && notification.read) {
      notification.readAt = new Date();
    }
  });

  return Notification;
};