const { validateQuest } = require('../middleware/validation');
const AppError = require('../utils/AppError');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {};
    next = jest.fn();
  });

  describe('validateQuest', () => {
    it('有効なクエストデータで次のミドルウェアを呼ぶ', () => {
      req.body = {
        title: '有効なタイトル',
        description: '有効な説明文',
        reward: '100ゴールド',
        difficulty: 'A'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('タイトルが空の場合エラー', () => {
      req.body = {
        title: '',
        description: '説明',
        reward: '報酬',
        difficulty: 'B'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('タイトルは必須です');
      expect(error.statusCode).toBe(400);
    });

    it('タイトルが100文字を超える場合エラー', () => {
      req.body = {
        title: 'あ'.repeat(101),
        description: '説明',
        reward: '報酬',
        difficulty: 'C'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('タイトルは100文字以内で入力してください');
    });

    it('説明が空の場合エラー', () => {
      req.body = {
        title: 'タイトル',
        description: '',
        reward: '報酬',
        difficulty: 'D'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('説明は必須です');
    });

    it('説明が1000文字を超える場合エラー', () => {
      req.body = {
        title: 'タイトル',
        description: 'あ'.repeat(1001),
        reward: '報酬',
        difficulty: 'E'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('説明は1000文字以内で入力してください');
    });

    it('報酬が空の場合エラー', () => {
      req.body = {
        title: 'タイトル',
        description: '説明',
        reward: '',
        difficulty: 'S'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('報酬は必須です');
    });

    it('難易度が無効な値の場合エラー', () => {
      req.body = {
        title: 'タイトル',
        description: '説明',
        reward: '報酬',
        difficulty: 'Z'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('難易度は E, D, C, B, A, S, SS のいずれかを選択してください');
    });

    it('複数のエラーがある場合、すべてのエラーメッセージを含む', () => {
      req.body = {
        title: '',
        description: '',
        reward: '',
        difficulty: 'INVALID'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('タイトルは必須です');
      expect(error.message).toContain('説明は必須です');
      expect(error.message).toContain('報酬は必須です');
      expect(error.message).toContain('難易度は');
    });

    it('空白のみの入力は無効とする', () => {
      req.body = {
        title: '   ',
        description: '\n\t',
        reward: '  ',
        difficulty: 'A'
      };

      validateQuest(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('タイトルは必須です');
      expect(error.message).toContain('説明は必須です');
      expect(error.message).toContain('報酬は必須です');
    });
  });
});