import React, { useState, useEffect } from 'react';
import QuestCard from './QuestCard';
import QuestDetail from './QuestDetail';
import { getQuests, acceptQuest, completeQuest } from '../services/api';
import './QuestBoard.css';

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'in_progress' | 'completed';
  reward: string;
  difficulty: string;
  mdFilePath: string;
}

const QuestBoard: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const data = await getQuests();
      setQuests(data.quests);
      setError(null);
    } catch (err) {
      setError('クエストの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleAcceptQuest = async (questId: string) => {
    try {
      await acceptQuest(questId);
      await fetchQuests();
      if (selectedQuest?.id === questId) {
        const updatedQuest = quests.find(q => q.id === questId);
        if (updatedQuest) {
          setSelectedQuest({ ...updatedQuest, status: 'in_progress' });
        }
      }
    } catch (err) {
      console.error('クエストの受注に失敗しました', err);
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      await completeQuest(questId);
      await fetchQuests();
      setSelectedQuest(null);
    } catch (err) {
      console.error('クエストの完了に失敗しました', err);
    }
  };

  if (loading) {
    return <div className="quest-board-loading">読み込み中...</div>;
  }

  if (error) {
    return <div className="quest-board-error">{error}</div>;
  }

  return (
    <div className="quest-board">
      <h1>クエストボード</h1>
      <div className="quest-board-content">
        <div className="quest-list">
          <h2>クエスト一覧</h2>
          {quests.length === 0 ? (
            <p className="no-quests">現在利用可能なクエストはありません</p>
          ) : (
            <div className="quest-cards">
              {quests.map(quest => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClick={() => setSelectedQuest(quest)}
                  selected={selectedQuest?.id === quest.id}
                />
              ))}
            </div>
          )}
        </div>
        {selectedQuest && (
          <div className="quest-detail-container">
            <QuestDetail
              quest={selectedQuest}
              onAccept={handleAcceptQuest}
              onComplete={handleCompleteQuest}
              onClose={() => setSelectedQuest(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestBoard;