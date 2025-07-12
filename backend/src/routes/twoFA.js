const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { authenticate } = require('../middleware/auth');
const { User } = require('../models');

// 2FA設定開始
router.post('/setup', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FAはすでに有効になっています' });
    }

    // シークレットキーを生成
    const secret = speakeasy.generateSecret({
      name: `QuestBoard (${user.email})`,
      issuer: 'QuestBoard',
      length: 32
    });

    // 一時的にシークレットを保存（確認後に正式保存）
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // QRコードを生成
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA設定に失敗しました' });
  }
});

// 2FA設定確認
router.post('/verify-setup', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ error: '2FA設定が開始されていません' });
    }

    // トークンを検証
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: '無効な認証コードです' });
    }

    // 2FAを有効化
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorEnabled = true;
    user.twoFactorTempSecret = null;

    // バックアップコードを生成
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(speakeasy.generateSecret({ length: 8 }).base32);
    }
    user.twoFactorBackupCodes = backupCodes;

    await user.save();

    res.json({
      message: '2FAが有効になりました',
      backupCodes
    });
  } catch (error) {
    console.error('2FA verify setup error:', error);
    res.status(500).json({ error: '2FA確認に失敗しました' });
  }
});

// 2FA無効化
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FAは有効になっていません' });
    }

    // パスワード確認（Google認証の場合はスキップ）
    if (user.password && password) {
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'パスワードが正しくありません' });
      }
    }

    // 2FAトークンを検証
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      // バックアップコードで試す
      const backupCodeIndex = user.twoFactorBackupCodes?.indexOf(token);
      if (backupCodeIndex === -1) {
        return res.status(400).json({ error: '無効な認証コードです' });
      }
    }

    // 2FAを無効化
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = null;
    await user.save();

    res.json({ message: '2FAが無効になりました' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: '2FA無効化に失敗しました' });
  }
});

// 2FA認証
router.post('/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findByPk(userId);

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FAが設定されていません' });
    }

    // トークンを検証
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (verified) {
      return res.json({ verified: true });
    }

    // バックアップコードで試す
    const backupCodeIndex = user.twoFactorBackupCodes?.indexOf(token);
    if (backupCodeIndex !== -1) {
      // 使用したバックアップコードを削除
      user.twoFactorBackupCodes.splice(backupCodeIndex, 1);
      await user.save();
      return res.json({ verified: true, backupCodeUsed: true });
    }

    res.status(400).json({ error: '無効な認証コードです' });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: '2FA認証に失敗しました' });
  }
});

// バックアップコード再生成
router.post('/regenerate-backup-codes', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FAが有効になっていません' });
    }

    // 2FAトークンを検証
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: '無効な認証コードです' });
    }

    // 新しいバックアップコードを生成
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(speakeasy.generateSecret({ length: 8 }).base32);
    }
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      message: 'バックアップコードを再生成しました',
      backupCodes
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({ error: 'バックアップコード再生成に失敗しました' });
  }
});

module.exports = router;