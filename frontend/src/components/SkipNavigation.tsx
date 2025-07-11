import React from 'react';
import './SkipNavigation.css';

const SkipNavigation: React.FC = () => {
  return (
    <nav className="skip-navigation" aria-label="スキップナビゲーション">
      <a href="#main-content" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <a href="#quest-list" className="skip-link">
        クエスト一覧へスキップ
      </a>
      <a href="#search" className="skip-link">
        検索へスキップ
      </a>
    </nav>
  );
};

export default SkipNavigation;