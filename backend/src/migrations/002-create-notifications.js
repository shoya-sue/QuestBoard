module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Notifications テーブル
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      related_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      related_type: {
        type: Sequelize.ENUM('quest', 'user', 'achievement'),
        allowNull: true,
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // インデックスの追加
    await queryInterface.addIndex('notifications', ['user_id', 'read']);
    await queryInterface.addIndex('notifications', ['user_id', 'created_at']);
    await queryInterface.addIndex('notifications', ['related_id', 'related_type']);

    // Users テーブルに通知設定カラムを追加
    await queryInterface.addColumn('users', 'email_notifications', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    await queryInterface.addColumn('users', 'notification_types', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: ['quest_created', 'quest_accepted', 'quest_completed', 'level_up', 'achievement_unlocked'],
    });

    await queryInterface.addColumn('users', 'locale', {
      type: Sequelize.STRING,
      defaultValue: 'ja',
    });

    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // カラムの削除
    await queryInterface.removeColumn('users', 'email_notifications');
    await queryInterface.removeColumn('users', 'notification_types');
    await queryInterface.removeColumn('users', 'locale');
    await queryInterface.removeColumn('users', 'status');

    // テーブルの削除
    await queryInterface.dropTable('notifications');

    // ENUMタイプの削除
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_related_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  },
};