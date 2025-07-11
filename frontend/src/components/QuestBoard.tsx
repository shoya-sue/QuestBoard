import React, { useState, useEffect } from 'react';
import QuestCard from './QuestCard';
import QuestDetail from './QuestDetail';
import GoogleLogin from './GoogleLogin';
import AdminPanel from './AdminPanel';
import QuestFilter, { FilterOptions } from './QuestFilter';
import Pagination from './Pagination';
import Notification from './Notification';
import QuestHistory from './QuestHistory';
import SearchBar from './SearchBar';
import NotificationCenter from './NotificationCenter';
import { getQuests, acceptQuest, completeQuest, Pagination as PaginationType } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket';
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
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    difficulty: '',
    status: '',
    searchTerm: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Quest[]>([]);
  const { user, logout } = useAuth();

  const handleSearch = async (query: string, searchFilters: any) => {
    if (!query) {
      setIsSearching(false);
      await fetchQuests(currentPage);
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/search/quests?` + 
        new URLSearchParams({
          q: query,
          page: currentPage.toString(),
          limit: '10',
          ...searchFilters
        })
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.quests);
      setFilteredQuests(data.quests);
      setPagination({
        currentPage: data.page,
        totalPages: data.totalPages,
        totalItems: data.total,
        itemsPerPage: 10
      });
    } catch (error) {
      console.error('Search error:', error);
      setError('検索中にエラーが発生しました');
      setNotification({
        message: '検索中にエラーが発生しました',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuests = async (page = 1) => {
    try {
      setLoading(true);
      setIsSearching(false);
      const data = await getQuests(page);
      setQuests(data.quests);
      setPagination(data.pagination);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError('クエストの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests(currentPage);
    
    // WebSocket接続
    socketService.connect();
    
    // WebSocketイベントリスナー
    socketService.onQuestUpdate((data) => {
      console.log('Quest update received:', data);
      
      // 現在のページを再読み込み
      if (data.type === 'created' || data.type === 'deleted') {
        fetchQuests(currentPage);
        
        // 通知表示
        if (data.type === 'created') {
          setNotification({
            message: `新しいクエスト「${data.quest.title}」が追加されました`,
            type: 'info'
          });
        } else {
          setNotification({
            message: 'クエストが削除されました',
            type: 'info'
          });
        }
      } else if (data.type === 'updated' || data.type === 'accepted' || data.type === 'completed') {
        // 特定のクエストのみ更新
        setQuests(prevQuests => 
          prevQuests.map(q => q.id === data.quest.id ? data.quest : q)
        );
        
        // 選択中のクエストも更新
        if (selectedQuest?.id === data.quest.id) {
          setSelectedQuest(data.quest);
        }
        
        // 通知表示
        if (data.type === 'accepted' && data.quest.acceptedBy !== user?.id) {
          setNotification({
            message: `クエスト「${data.quest.title}」が他のユーザーに受注されました`,
            type: 'warning'
          });
        } else if (data.type === 'completed') {
          setNotification({
            message: `クエスト「${data.quest.title}」が完了しました`,
            type: 'success'
          });
        }
      }
    });
    
    return () => {
      socketService.offQuestUpdate();
      socketService.disconnect();
    };
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

  const handlePageChange = (page: number) => {
    fetchQuests(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err && (err as any).response?.status === 401) {
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
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err && (err as any).response?.status === 403) {
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
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="quest-board-header">
        <h1>クエストボード</h1>
        <div className="user-info">
          {user ? (
            <>
              <span>ようこそ、{user.username}さん</span>
              <NotificationCenter />
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className="history-button"
              >
                {showHistory ? 'クエスト一覧' : '完了履歴'}
              </button>
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
      ) : showHistory && user ? (
        <QuestHistory userId={user.id} />
      ) : (
        <div className="quest-board-content">
          <div className="quest-list">
            <h2>クエスト一覧</h2>
            <SearchBar onSearch={handleSearch} showFilters={true} />
            <QuestFilter filters={filters} onFilterChange={setFilters} />
            {filteredQuests.length === 0 ? (
              <p className="no-quests">
                {isSearching
                  ? '検索結果が見つかりませんでした'
                  : quests.length === 0 
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
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
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