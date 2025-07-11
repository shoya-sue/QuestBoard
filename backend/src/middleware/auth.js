const userService = require('../services/userService');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = userService.verifyToken(token);
    if (!decoded) {
      throw new Error();
    }

    const user = await userService.getUserById(decoded.id);
    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: '認証が必要です' });
  }
};

const isAdmin = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: '管理者権限が必要です' });
  }
};

module.exports = { authenticate, isAdmin };