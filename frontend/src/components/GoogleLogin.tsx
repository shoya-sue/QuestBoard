import React from 'react';
import { GoogleLogin as GoogleOAuthLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './GoogleLogin.css';

interface GoogleLoginProps {
  onSuccess?: () => void;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess }) => {
  const { googleLogin } = useAuth();

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

  const handleError = () => {
    console.error('Google login error');
  };

  return (
    <div className="google-login-container">
      <h2>ログイン</h2>
      <p>Googleアカウントでログインしてください</p>
      <GoogleOAuthLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        theme="outline"
        size="large"
        text="signin_with"
        locale="ja"
      />
    </div>
  );
};

export default GoogleLogin;