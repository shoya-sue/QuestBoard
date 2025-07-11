const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const jwt = require('jsonwebtoken');

// モック設定
jest.mock('google-auth-library');
jest.mock('jsonwebtoken');
jest.mock('../services/userService');

const { OAuth2Client } = require('google-auth-library');
const userService = require('../services/userService');

// テスト用のExpressアプリケーション設定
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      verifyIdToken: jest.fn()
    };
    OAuth2Client.mockImplementation(() => mockClient);
  });

  describe('POST /api/auth/google', () => {
    it('有効なGoogleトークンで認証成功', async () => {
      const mockPayload = {
        sub: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      userService.findOrCreateUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'Test User',
        role: 'user'
      });

      jwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'Test User',
          role: 'user'
        }
      });
    });

    it('無効なGoogleトークンでエラー', async () => {
      mockClient.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'invalid-google-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Google認証に失敗しました');
    });

    it('トークンが提供されない場合エラー', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('認証情報が必要です');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('有効なJWTトークンで認証成功', async () => {
      jwt.verify.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com'
      });

      userService.getUserById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'Test User',
        role: 'user'
      });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com'
      });
    });

    it('無効なJWTトークンでエラー', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('トークンなしでエラー', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });
  });
});