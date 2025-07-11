import React from 'react';
import { GoogleLogin as GoogleOAuthLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './GoogleLogin.css';

interface GoogleLoginProps {
  onSuccess?: () => void;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess }) => {
  const { googleLogin } = useAuth();
  
  // 開発モードのチェック
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isDevClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID?.includes('123456789012');
  const devMode = isDevelopment && isDevClientId;

  const handleSuccess = async (credentialResponse: any) => {
    try {
      await googleLogin(credentialResponse.credential);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };
  
  const handleDevLogin = async (asAdmin = false) => {
    try {
      await googleLogin(asAdmin ? 'admin-token' : 'dev-token');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Dev login failed:', error);
    }
  };

  const handleError = () => {
    console.error('Google login error');
  };

  return (
    <div className="google-login-container">
      <h2>ログイン</h2>
      <p>Googleアカウントでログインしてください</p>
      {devMode ? (
        <div className="dev-login-buttons">
          <button 
            className="dev-login-button"
            onClick={() => handleDevLogin(false)}
          >
            開発ユーザーでログイン
          </button>
          <button 
            className="dev-login-button dev-login-button--admin"
            onClick={() => handleDevLogin(true)}
          >
            管理者でログイン
          </button>
          <p className="dev-login-notice">⚠️ 開発モード</p>
        </div>
      ) : (
        <GoogleOAuthLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          theme="outline"
          size="large"
          text="signin_with"
          locale="ja"
        />
      )}
    </div>
  );
};

export default GoogleLogin;