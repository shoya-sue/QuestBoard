import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // インストールプロンプトを表示したことがない場合のみ表示
      const hasShownPrompt = localStorage.getItem('pwa-install-prompt-shown');
      if (!hasShownPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWAがインストールされました');
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-shown', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-shown', 'true');
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-prompt__content">
        <div className="pwa-install-prompt__icon">
          <img src="/logo192.png" alt="Quest Board" />
        </div>
        <div className="pwa-install-prompt__text">
          <h3>クエストボードをインストール</h3>
          <p>ホーム画面に追加してオフラインでも使用できます</p>
        </div>
        <div className="pwa-install-prompt__actions">
          <button 
            className="pwa-install-prompt__dismiss"
            onClick={handleDismiss}
          >
            後で
          </button>
          <button 
            className="pwa-install-prompt__install"
            onClick={handleInstallClick}
          >
            インストール
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;