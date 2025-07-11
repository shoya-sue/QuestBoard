const AppError = require('../utils/AppError');

const validateQuest = (req, res, next) => {
  const { title, description, reward, difficulty } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('タイトルは必須です');
  } else if (title.length > 100) {
    errors.push('タイトルは100文字以内で入力してください');
  }

  if (!description || description.trim().length === 0) {
    errors.push('説明は必須です');
  } else if (description.length > 1000) {
    errors.push('説明は1000文字以内で入力してください');
  }

  if (!reward || reward.trim().length === 0) {
    errors.push('報酬は必須です');
  }

  if (!difficulty || difficulty.trim().length === 0) {
    errors.push('難易度は必須です');
  } else if (!['E', 'D', 'C', 'B', 'A', 'S', 'SS'].includes(difficulty)) {
    errors.push('難易度は E, D, C, B, A, S, SS のいずれかを選択してください');
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }

  next();
};

module.exports = {
  validateQuest
};