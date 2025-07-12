import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import QuestRating from './QuestRating';
import './QuestDetail.css';

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'in_progress' | 'completed';
  reward: string;
  difficulty: string;
  mdFilePath: string;
  acceptedBy?: string;
}

interface QuestDetailProps {
  quest: Quest;
  onAccept: (questId: string) => void;
  onComplete: (questId: string) => void;
  onClose: () => void;
}

const QuestDetail: React.FC<QuestDetailProps> = ({ quest, onAccept, onComplete, onClose }) => {
  const { user } = useAuth();
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'E': return '#4caf50';
      case 'D': return '#8bc34a';
      case 'C': return '#ffeb3b';
      case 'B': return '#ff9800';
      case 'A': return '#ff5722';
      case 'S': return '#f44336';
      case 'SS': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '未受注';
      case 'in_progress': return '受注中';
      case 'completed': return '完了';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4caf50';
      case 'in_progress': return '#2196f3';
      case 'completed': return '#9e9e9e';
      default: return '#757575';
    }
  };

  return (
    <div className="quest-detail">
      <div className="quest-detail-header">
        <h2>{quest.title}</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>
      
      <div className="quest-detail-info">
        <div className="info-item">
          <span className="info-label">難易度:</span>
          <span 
            className="quest-difficulty-badge"
            style={{ backgroundColor: getDifficultyColor(quest.difficulty) }}
          >
            {quest.difficulty}級
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">ステータス:</span>
          <span 
            className="quest-status-badge"
            style={{ color: getStatusColor(quest.status) }}
          >
            {getStatusText(quest.status)}
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">報酬:</span>
          <span className="info-value">{quest.reward}</span>
        </div>
      </div>
      
      <div className="quest-detail-description">
        <h3>依頼内容</h3>
        <p>{quest.description}</p>
      </div>
      
      <div className="quest-detail-actions">
        {quest.status === 'available' && (
          <button 
            className="action-button accept-button"
            onClick={() => onAccept(quest.id)}
          >
            クエストを受注する
          </button>
        )}
        
        {quest.status === 'in_progress' && user && quest.acceptedBy === user.id && (
          <button 
            className="action-button complete-button"
            onClick={() => onComplete(quest.id)}
          >
            クエストを完了する
          </button>
        )}
        
        <a 
          href={`http://localhost:3001${quest.mdFilePath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="markdown-link"
        >
          詳細ファイルを表示
        </a>
      </div>
      
      <QuestRating questId={quest.id} />
    </div>
  );
};

export default QuestDetail;