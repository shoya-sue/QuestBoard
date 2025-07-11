'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      google_id: {
        type: Sequelize.STRING,
        unique: true,
      },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        defaultValue: 'user',
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      experience: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      profile_picture: {
        type: Sequelize.STRING,
      },
      bio: {
        type: Sequelize.TEXT,
      },
      preferences: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      last_login_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Quests table
    await queryInterface.createTable('quests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM('available', 'in_progress', 'completed'),
        defaultValue: 'available',
      },
      reward: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reward_points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      difficulty: {
        type: Sequelize.ENUM('E', 'D', 'C', 'B', 'A', 'S', 'SS'),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      max_participants: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      current_participants: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      deadline: {
        type: Sequelize.DATE,
      },
      requirements: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      image_url: {
        type: Sequelize.STRING,
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      accepted_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      accepted_at: {
        type: Sequelize.DATE,
      },
      completed_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Quest History table
    await queryInterface.createTable('quest_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      quest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'quests',
          key: 'id',
        },
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      action: {
        type: Sequelize.ENUM('accepted', 'completed', 'abandoned', 'failed'),
        allowNull: false,
      },
      earned_points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      earned_experience: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      completion_time: {
        type: Sequelize.INTEGER,
      },
      rating: {
        type: Sequelize.INTEGER,
      },
      comment: {
        type: Sequelize.TEXT,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Achievements table
    await queryInterface.createTable('achievements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING,
      },
      category: {
        type: Sequelize.ENUM('quest', 'social', 'exploration', 'special'),
        defaultValue: 'quest',
      },
      rarity: {
        type: Sequelize.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
        defaultValue: 'common',
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      requirements: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      rewards: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // User Achievements table
    await queryInterface.createTable('user_achievements', {
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
      },
      achievement_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'achievements',
          key: 'id',
        },
      },
      unlocked_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Indexes
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['google_id']);
    await queryInterface.addIndex('quests', ['status']);
    await queryInterface.addIndex('quests', ['difficulty']);
    await queryInterface.addIndex('quests', ['created_by']);
    await queryInterface.addIndex('quest_history', ['user_id']);
    await queryInterface.addIndex('quest_history', ['quest_id']);
    await queryInterface.addIndex('user_achievements', ['user_id', 'achievement_id'], {
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_achievements');
    await queryInterface.dropTable('achievements');
    await queryInterface.dropTable('quest_history');
    await queryInterface.dropTable('quests');
    await queryInterface.dropTable('users');
  },
};