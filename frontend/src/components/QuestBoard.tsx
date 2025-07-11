import React, { useState, useEffect } from 'react';
import QuestCard from './QuestCard';
import QuestDetail from './QuestDetail';
import GoogleLogin from './GoogleLogin';
import AdminPanel from './AdminPanel';
import QuestFilter, { FilterOptions } from './QuestFilter';
import { getQuests, acceptQuest, completeQuest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './QuestBoard.css';

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

const QuestBoard: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filteredQuests, setFilteredQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    difficulty: '',
    status: '',
    searchTerm: ''
  });
  const { user, logout } = useAuth();

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

  useEffect(() => {
    let filtered = quests;

    if (filters.searchTerm) {
      filtered = filtered.filter(quest =>
        quest.title.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    if (filters.difficulty) {
      filtered = filtered.filter(quest => quest.difficulty === filters.difficulty);
    }

    if (filters.status) {
      filtered = filtered.filter(quest => quest.status === filters.status);
    }

    setFilteredQuests(filtered);
  }, [quests, filters]);

  const handleAcceptQuest = async (questId: string) => {
    if (!user) {
      setShowAuthForm(true);
      return;
    }
    
    try {
      await acceptQuest(questId);
      await fetchQuests();
      if (selectedQuest?.id === questId) {
        const updatedQuest = quests.find(q => q.id === questId);
        if (updatedQuest) {
          setSelectedQuest({ ...updatedQuest, status: 'in_progress' });
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setShowAuthForm(true);
      } else {
        alert('クエストの受注に失敗しました');
      }
      console.error('クエストの受注に失敗しました', err);
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      await completeQuest(questId);
      await fetchQuests();
      setSelectedQuest(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('このクエストを完了する権限がありません');
      } else {
        alert('クエストの完了に失敗しました');
      }
      console.error('クエストの完了に失敗しました', err);
    }
  };

  if (loading) {
    return <div className="quest-board-loading">読み込み中...</div>;
  }

  if (error) {
    return <div className="quest-board-error">{error}</div>;
  }

  if (showAuthForm && !user) {
    return (
      <div className="quest-board">
        <h1>クエストボード</h1>
        <GoogleLogin onSuccess={() => setShowAuthForm(false)} />
      </div>
    );
  }

  return (
    <div className="quest-board">
      <div className="quest-board-header">
        <h1>クエストボード</h1>
        <div className="user-info">
          {user ? (
            <>
              <span>ようこそ、{user.username}さん</span>
              {user.role === 'admin' && (
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className="admin-button"
                >
                  {showAdminPanel ? 'クエスト一覧' : '管理画面'}
                </button>
              )}
              <button onClick={logout} className="logout-button">ログアウト</button>
            </>
          ) : (
            <button onClick={() => setShowAuthForm(true)} className="login-button">
              ログイン
            </button>
          )}
        </div>
      </div>
      {showAdminPanel && user?.role === 'admin' ? (
        <AdminPanel />
      ) : (
        <div className="quest-board-content">
          <div className="quest-list">
            <h2>クエスト一覧</h2>
            <QuestFilter filters={filters} onFilterChange={setFilters} />
            {filteredQuests.length === 0 ? (
              <p className="no-quests">
                {quests.length === 0 
                  ? '現在利用可能なクエストはありません' 
                  : '条件に一致するクエストが見つかりません'}
              </p>
            ) : (
              <div className="quest-cards">
                {filteredQuests.map(quest => (
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
      )}
    </div>
  );
};

export default QuestBoard;