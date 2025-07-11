import React from 'react';
import './QuestCard.css';

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'in_progress' | 'completed';
  reward: string;
  difficulty: string;
}

interface QuestCardProps {
  quest: Quest;
  onClick: () => void;
  selected: boolean;
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, onClick, selected }) => {
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
    <div 
      className={`quest-card ${selected ? 'selected' : ''}`} 
      onClick={onClick}
    >
      <div className="quest-card-header">
        <h3>{quest.title}</h3>
        <span 
          className="quest-difficulty"
          style={{ backgroundColor: getDifficultyColor(quest.difficulty) }}
        >
          {quest.difficulty}級
        </span>
      </div>
      <p className="quest-description">{quest.description}</p>
      <div className="quest-card-footer">
        <span className="quest-reward">報酬: {quest.reward}</span>
        <span 
          className="quest-status"
          style={{ color: getStatusColor(quest.status) }}
        >
          {getStatusText(quest.status)}
        </span>
      </div>
    </div>
  );
};

export default QuestCard;