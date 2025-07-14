import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Lazy loading for code splitting
const QuestBoard = React.lazy(() => import('./components/QuestBoard'));
const PWAInstallPrompt = React.lazy(() => import('./components/PWAInstallPrompt'));

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

// Loading component
const LoadingSpinner = () => (
  <div className="loading-spinner" role="status" aria-label="読み込み中">
    <div className="spinner"></div>
    <span className="loading-text">読み込み中...</span>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <div className="App">
              <Suspense fallback={<LoadingSpinner />}>
                <QuestBoard />
                <PWAInstallPrompt />
              </Suspense>
            </div>
          </AuthProvider>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
