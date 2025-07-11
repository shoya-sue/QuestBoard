// 開発環境用の認証モック
const DEV_MODE = process.env.NODE_ENV === 'development' && 
                 process.env.GOOGLE_CLIENT_ID?.includes('123456789012');

const devGoogleAuth = async (credential) => {
  if (!DEV_MODE) {
    throw new Error('Dev auth only available in development mode');
  }
  
  // 開発用のダミーユーザー
  const devUser = {
    id: 'dev-user-' + Date.now(),
    email: 'dev@questboard.local',
    username: '開発ユーザー',
    googleId: 'dev-google-' + Date.now(),
    role: credential === 'admin-token' ? 'admin' : 'user'
  };
  
  return {
    user: devUser,
    token: 'dev-jwt-token-' + Date.now()
  };
};

module.exports = { DEV_MODE, devGoogleAuth };
