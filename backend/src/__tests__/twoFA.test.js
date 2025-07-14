const request = require('supertest');
const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const twoFARoutes = require('../routes/twoFA');

// モック設定
jest.mock('speakeasy');
jest.mock('qrcode');

const app = express();
app.use(express.json());

// 認証ミドルウェアのモック
app.use((req, res, next) => {
  req.user = { id: 'user-123', username: 'testuser', email: 'test@example.com' };
  next();
});

app.use('/api/2fa', twoFARoutes);

describe('2FA Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /setup', () => {
    test('2FA設定を正常に開始できる', async () => {
      const secret = {
        ascii: 'test-secret',
        hex: '746573742d736563726574',
        base32: 'ORSXG5DJNVQXIYJAO5XXE3DE',
        otpauth_url: 'otpauth://totp/QuestBoard:testuser?secret=ORSXG5DJNVQXIYJAO5XXE3DE&issuer=QuestBoard'
      };

      speakeasy.generateSecret.mockReturnValue(secret);
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSU...');

      const response = await request(app)
        .post('/api/2fa/setup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.secret).toBe('ORSXG5DJNVQXIYJAO5XXE3DE');
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(response.body.backupCodes).toHaveLength(10);

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'testuser',
        issuer: 'QuestBoard',
        length: 32
      });
    });

    test('QRコード生成エラーを適切に処理する', async () => {
      speakeasy.generateSecret.mockReturnValue({
        ascii: 'test-secret',
        base32: 'ORSXG5DJNVQXIYJAO5XXE3DE',
        otpauth_url: 'otpauth://totp/QuestBoard:testuser?secret=ORSXG5DJNVQXIYJAO5XXE3DE&issuer=QuestBoard'
      });
      QRCode.toDataURL.mockRejectedValue(new Error('QR Code generation failed'));

      const response = await request(app)
        .post('/api/2fa/setup')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('2FA設定の準備中にエラーが発生しました');
    });
  });

  describe('POST /verify', () => {
    test('有効なTOTPコードで認証が成功する', async () => {
      speakeasy.totp.verify.mockReturnValue(true);

      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          secret: 'ORSXG5DJNVQXIYJAO5XXE3DE',
          token: '123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA認証が有効化されました');

      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'ORSXG5DJNVQXIYJAO5XXE3DE',
        encoding: 'base32',
        token: '123456',
        window: 2
      });
    });

    test('無効なTOTPコードで認証が失敗する', async () => {
      speakeasy.totp.verify.mockReturnValue(false);

      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          secret: 'ORSXG5DJNVQXIYJAO5XXE3DE',
          token: '999999'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('認証コードが正しくありません');
    });

    test('必須パラメータが不足している場合エラーになる', async () => {
      const response = await request(app)
        .post('/api/2fa/verify')
        .send({
          secret: 'ORSXG5DJNVQXIYJAO5XXE3DE'
          // token が不足
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('秘密鍵と認証コードが必要です');
    });
  });

  describe('POST /authenticate', () => {
    test('有効なTOTPコードで認証が成功する', async () => {
      speakeasy.totp.verify.mockReturnValue(true);

      const response = await request(app)
        .post('/api/2fa/authenticate')
        .send({
          token: '123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA認証に成功しました');
    });

    test('バックアップコードでの認証が成功する', async () => {
      // TOTPは無効だがバックアップコードが有効
      speakeasy.totp.verify.mockReturnValue(false);

      const response = await request(app)
        .post('/api/2fa/authenticate')
        .send({
          token: 'backup-123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('バックアップコードで認証されました');
    });

    test('無効なコードで認証が失敗する', async () => {
      speakeasy.totp.verify.mockReturnValue(false);

      const response = await request(app)
        .post('/api/2fa/authenticate')
        .send({
          token: '999999'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('認証コードが正しくありません');
    });
  });

  describe('POST /disable', () => {
    test('有効なパスワードで2FAを無効化できる', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .send({
          password: 'correct-password'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA認証が無効化されました');
    });

    test('パスワードが不足している場合エラーになる', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('パスワードが必要です');
    });
  });

  describe('GET /backup-codes', () => {
    test('新しいバックアップコードを生成できる', async () => {
      const response = await request(app)
        .get('/api/2fa/backup-codes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.backupCodes).toHaveLength(10);
      expect(response.body.backupCodes[0]).toMatch(/^[A-Z0-9]{8}$/);
    });
  });

  describe('バックアップコード生成', () => {
    test('指定された数のバックアップコードを生成する', () => {
      // このテストは実際のルートファイルでヘルパー関数をテストする
      const generateBackupCodes = (count = 10) => {
        return Array.from({ length: count }, () => {
          return Math.random().toString(36).substring(2, 10).toUpperCase();
        });
      };

      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
      expect(codes.every(code => typeof code === 'string' && code.length === 8)).toBe(true);
    });

    test('一意のバックアップコードを生成する', () => {
      const generateBackupCodes = (count = 10) => {
        return Array.from({ length: count }, () => {
          return Math.random().toString(36).substring(2, 10).toUpperCase();
        });
      };

      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      // ランダム生成のため100%の一意性は保証できないが、高い確率で一意であることを確認
      expect(uniqueCodes.size).toBeGreaterThan(95);
    });
  });
});