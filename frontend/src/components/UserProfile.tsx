import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

interface UserStats {
  completedQuests: number;
  totalPoints: number;
  rank: string;
  joinedDate: string;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    bio: '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('統計情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${user?.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setIsEditing(false);
        // プロフィール更新成功の通知を表示
      }
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
    }
  };

  const getRankIcon = (rank: string) => {
    const rankIcons: { [key: string]: string } = {
      'ブロンズ': '🥉',
      'シルバー': '🥈',
      'ゴールド': '🥇',
      'プラチナ': '💎',
      'マスター': '👑'
    };
    return rankIcons[rank] || '🎖️';
  };

  if (!user) {
    return <div className="user-profile-login">ログインしてプロフィールを表示</div>;
  }

  if (loading) {
    return <div className="user-profile-loading">読み込み中...</div>;
  }

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        <div className="user-profile__avatar">
          <img 
            src={profileData.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=4a90e2&color=fff`} 
            alt={user.username} 
          />
          {isEditing && (
            <button className="user-profile__avatar-edit">
              📷 変更
            </button>
          )}
        </div>
        
        <div className="user-profile__info">
          {isEditing ? (
            <input
              type="text"
              className="user-profile__username-input"
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            />
          ) : (
            <h2 className="user-profile__username">{user.username}</h2>
          )}
          
          <p className="user-profile__email">{user.email}</p>
          
          {stats && (
            <div className="user-profile__rank">
              <span className="user-profile__rank-icon">{getRankIcon(stats.rank)}</span>
              <span className="user-profile__rank-name">{stats.rank}冒険者</span>
            </div>
          )}
        </div>

        <div className="user-profile__actions">
          {isEditing ? (
            <>
              <button onClick={handleUpdateProfile} className="btn-save">
                保存
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-cancel">
                キャンセル
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-edit">
              プロフィール編集
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="user-profile__bio-section">
          <label>自己紹介</label>
          <textarea
            className="user-profile__bio-input"
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            placeholder="自己紹介を入力してください..."
            rows={4}
          />
        </div>
      )}

      {stats && (
        <>
          <div className="user-profile__stats">
            <div className="stat-card">
              <div className="stat-card__value">{stats.completedQuests}</div>
              <div className="stat-card__label">完了クエスト</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.totalPoints}</div>
              <div className="stat-card__label">獲得ポイント</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.joinedDate}</div>
              <div className="stat-card__label">参加日</div>
            </div>
          </div>

          <div className="user-profile__achievements">
            <h3>実績</h3>
            <div className="achievements-grid">
              {stats.achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`achievement ${achievement.unlockedAt ? 'unlocked' : 'locked'}`}
                  title={achievement.description}
                >
                  <div className="achievement__icon">{achievement.icon}</div>
                  <div className="achievement__name">{achievement.name}</div>
                  {achievement.unlockedAt && (
                    <div className="achievement__date">
                      {new Date(achievement.unlockedAt).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;