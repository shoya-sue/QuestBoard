import React, { useState, useEffect } from 'react';
import QuestForm from './QuestForm';
import { getQuests, Quest, createQuest, updateQuest, deleteQuest } from '../services/api';
import './AdminPanel.css';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt?: string;
  completedQuests?: number;
  points?: number;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quests' | 'users'>('quests');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);

  const fetchAllQuests = async () => {
    try {
      setLoading(true);
      const data = await getQuests(1, 100); // 管理画面では全件表示
      setQuests(data.quests);
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quests') {
      fetchAllQuests();
    } else {
      fetchAllUsers();
    }
  }, [activeTab]);

  const handleCreateQuest = async (data: any) => {
    await createQuest(data);
    await fetchAllQuests();
    setShowForm(false);
  };

  const handleUpdateQuest = async (data: any) => {
    if (editingQuest) {
      await updateQuest(editingQuest.id, data);
      await fetchAllQuests();
      setEditingQuest(null);
      setShowForm(false);
    }
  };

  const handleDeleteQuest = async (id: string) => {
    if (window.confirm('本当にこのクエストを削除しますか？')) {
      try {
        await deleteQuest(id);
        await fetchAllQuests();
      } catch (error) {
        alert('削除に失敗しました');
      }
    }
  };

  const handleEdit = (quest: Quest) => {
    setEditingQuest(quest);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingQuest(null);
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error('Failed to update user role');
      await fetchAllUsers();
    } catch (error) {
      alert('ユーザー権限の更新に失敗しました');
    }
  };

  if (loading) {
    return <div className="admin-panel-loading">読み込み中...</div>;
  }

  if (showForm) {
    return (
      <div className="admin-panel">
        <h2>{editingQuest ? 'クエスト編集' : '新規クエスト作成'}</h2>
        <QuestForm
          initialData={editingQuest ? {
            title: editingQuest.title,
            description: editingQuest.description,
            reward: editingQuest.reward,
            difficulty: editingQuest.difficulty
          } : undefined}
          onSubmit={editingQuest ? handleUpdateQuest : handleCreateQuest}
          onCancel={handleCancel}
          submitText={editingQuest ? '更新' : '作成'}
        />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'quests' ? 'active' : ''}`}
          onClick={() => setActiveTab('quests')}
        >
          クエスト管理
        </button>
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          ユーザー管理
        </button>
      </div>

      {activeTab === 'quests' ? (
        <>
          <div className="admin-header">
            <h2>クエスト管理</h2>
            <button 
              className="create-button"
              onClick={() => setShowForm(true)}
            >
              新規クエスト作成
            </button>
          </div>

          <div className="quest-table">
            <table>
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>難易度</th>
                  <th>ステータス</th>
                  <th>報酬</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {quests.map(quest => (
                  <tr key={quest.id}>
                    <td>{quest.title}</td>
                    <td>
                      <span className={`difficulty-badge difficulty-${quest.difficulty}`}>
                        {quest.difficulty}級
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${quest.status}`}>
                        {quest.status === 'available' ? '未受注' :
                         quest.status === 'in_progress' ? '受注中' : '完了'}
                      </span>
                    </td>
                    <td>{quest.reward}</td>
                    <td className="actions">
                      <button 
                        className="edit-button"
                        onClick={() => handleEdit(quest)}
                      >
                        編集
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteQuest(quest.id)}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="admin-header">
            <h2>ユーザー管理</h2>
          </div>
          <div className="user-table">
            <table>
              <thead>
                <tr>
                  <th>ユーザー名</th>
                  <th>メール</th>
                  <th>権限</th>
                  <th>完了クエスト</th>
                  <th>ポイント</th>
                  <th>登録日</th>
                  <th>最終ログイン</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role === 'admin' ? '管理者' : 'ユーザー'}
                      </span>
                    </td>
                    <td>{user.completedQuests || 0}</td>
                    <td>{user.points || 0}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</td>
                    <td>
                      {user.lastLoginAt ? 
                        new Date(user.lastLoginAt).toLocaleDateString('ja-JP') : 
                        '-'
                      }
                    </td>
                    <td>
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                        className="role-select"
                      >
                        <option value="user">ユーザー</option>
                        <option value="admin">管理者</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;