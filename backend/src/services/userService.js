const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const USERS_DIR = path.join(__dirname, '../../data/users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');

class UserService {
  constructor() {
    this.ensureUsersFile();
  }

  async ensureUsersFile() {
    await fs.ensureDir(USERS_DIR);
    if (!await fs.pathExists(USERS_FILE)) {
      await fs.writeJson(USERS_FILE, { users: [] });
    }
  }

  async getAllUsers() {
    const data = await fs.readJson(USERS_FILE);
    return data.users;
  }

  async getUserByUsername(username) {
    const users = await this.getAllUsers();
    return users.find(user => user.username === username);
  }

  async getUserById(id) {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id);
  }

  async createUser(username, password, role = 'user') {
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error('ユーザー名は既に使用されています');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      acceptedQuests: []
    };

    const data = await fs.readJson(USERS_FILE);
    data.users.push(newUser);
    await fs.writeJson(USERS_FILE, data, { spaces: 2 });

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async validateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserQuests(userId, questId, action) {
    const data = await fs.readJson(USERS_FILE);
    const userIndex = data.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('ユーザーが見つかりません');
    }

    if (action === 'accept') {
      if (!data.users[userIndex].acceptedQuests.includes(questId)) {
        data.users[userIndex].acceptedQuests.push(questId);
      }
    } else if (action === 'complete') {
      data.users[userIndex].acceptedQuests = data.users[userIndex].acceptedQuests.filter(id => id !== questId);
    }

    await fs.writeJson(USERS_FILE, data, { spaces: 2 });
    return data.users[userIndex];
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new UserService();