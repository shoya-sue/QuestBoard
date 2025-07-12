import React, { useState } from 'react';
import './TwoFactorSetup.css';

interface TwoFactorSetupProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setStep('verify');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '2FA設定に失敗しました');
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setStep('complete');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '認証コードが正しくありません');
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questboard-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="two-factor-setup-overlay">
      <div className="two-factor-setup">
        <div className="two-factor-header">
          <h2>2段階認証の設定</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {step === 'setup' && (
          <div className="setup-step">
            <div className="step-description">
              <p>2段階認証を設定すると、アカウントのセキュリティが向上します。</p>
              <p>ログイン時にパスワードに加えて、認証アプリで生成されるコードが必要になります。</p>
            </div>
            
            <div className="app-recommendations">
              <h3>推奨認証アプリ:</h3>
              <ul>
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy</li>
                <li>1Password</li>
              </ul>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="setup-actions">
              <button 
                className="primary-button"
                onClick={handleSetup}
                disabled={loading}
              >
                {loading ? '設定中...' : '設定を開始'}
              </button>
              <button className="secondary-button" onClick={onClose}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="verify-step">
            <div className="qr-section">
              <h3>1. QRコードをスキャン</h3>
              <p>認証アプリでこのQRコードをスキャンしてください。</p>
              <div className="qr-code">
                <img src={qrCode} alt="2FA QR Code" />
              </div>
              
              <details className="manual-entry">
                <summary>QRコードが読み取れない場合</summary>
                <div className="manual-key">
                  <p>以下のキーを手動で入力してください:</p>
                  <code>{secret}</code>
                </div>
              </details>
            </div>

            <div className="verify-section">
              <h3>2. 認証コードを入力</h3>
              <p>認証アプリに表示される6桁のコードを入力してください。</p>
              
              <input
                type="text"
                className="token-input"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />

              {error && <div className="error-message">{error}</div>}

              <div className="verify-actions">
                <button 
                  className="primary-button"
                  onClick={handleVerify}
                  disabled={loading || token.length !== 6}
                >
                  {loading ? '確認中...' : '確認'}
                </button>
                <button 
                  className="secondary-button" 
                  onClick={() => setStep('setup')}
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="complete-step">
            <div className="success-icon">✅</div>
            <h3>2段階認証が有効になりました！</h3>
            
            <div className="backup-codes-section">
              <h4>バックアップコード</h4>
              <p>認証アプリにアクセスできない場合は、これらのコードを使用してログインできます。</p>
              <p className="warning">⚠️ 各コードは1回のみ使用可能です。安全な場所に保管してください。</p>
              
              <div className="backup-codes">
                {backupCodes.map((code, index) => (
                  <code key={index}>{code}</code>
                ))}
              </div>

              <button 
                className="download-button"
                onClick={handleDownloadBackupCodes}
              >
                バックアップコードをダウンロード
              </button>
            </div>

            <button 
              className="primary-button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              完了
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;