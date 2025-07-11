import React, { useState, useEffect } from 'react';
import { getCompletedQuests } from '../services/api';
import './QuestHistory.css';

interface CompletedQuest {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: string;
  completedAt?: string;
  acceptedBy?: string;
}

interface QuestHistoryProps {
  userId?: string;
}

const QuestHistory: React.FC<QuestHistoryProps> = ({ userId }) => {
  const [quests, setQuests] = useState<CompletedQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedQuests();
  }, [userId]);

  const fetchCompletedQuests = async () => {
    try {
      setLoading(true);
      const data = await getCompletedQuests(userId);
      setQuests(data);
      setError(null);
    } catch (err) {
      setError('完了クエストの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="quest-history-loading">読み込み中...</div>;
  }

  if (error) {
    return <div className="quest-history-error">{error}</div>;
  }

  return (
    <div className="quest-history">
      <h2>クエスト完了履歴</h2>
      {quests.length === 0 ? (
        <p className="no-history">まだ完了したクエストはありません</p>
      ) : (
        <div className="history-list">
          {quests.map(quest => (
            <div key={quest.id} className="history-item">
              <div className="history-item-header">
                <h3>{quest.title}</h3>
                <span className={`difficulty difficulty-${quest.difficulty}`}>
                  {quest.difficulty}
                </span>
              </div>
              <p className="history-item-description">{quest.description}</p>
              <div className="history-item-footer">
                <span className="reward">報酬: {quest.reward}</span>
                {quest.completedAt && (
                  <span className="completed-date">
                    完了日: {new Date(quest.completedAt).toLocaleDateString('ja-JP')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestHistory;