import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initSentry } from './config/sentry';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Initialize Sentry before rendering the app
initSentry();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for PWA support
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('オフラインで使用するためのコンテンツがキャッシュされました。');
  },
  onUpdate: () => {
    console.log('新しいコンテンツが利用可能です。すべてのタブを閉じると更新されます。');
  }
});
