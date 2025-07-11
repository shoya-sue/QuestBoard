import React, { useState, useEffect } from 'react';
import QuestForm from './QuestForm';
import { getQuests, Quest, createQuest, updateQuest, deleteQuest } from '../services/api';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);

  const fetchAllQuests = async () => {
    try {
      setLoading(true);
      const data = await getQuests();
      setQuests(data.quests);
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQuests();
  }, []);

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
    </div>
  );
};

export default AdminPanel;