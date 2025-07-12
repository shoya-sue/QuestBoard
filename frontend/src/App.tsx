import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import QuestBoard from './components/QuestBoard';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <div className="App">
              <QuestBoard />
              <PWAInstallPrompt />
            </div>
          </AuthProvider>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
