import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './QuestRating.css';

interface QuestRatingProps {
  questId: string;
  onRatingUpdate?: () => void;
}

interface Rating {
  id: string;
  userId: string;
  questId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  username?: string;
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  userRating?: number;
  distribution: { [key: number]: number };
}

const QuestRating: React.FC<QuestRatingProps> = ({ questId, onRatingUpdate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatingData();
  }, [questId]);

  const fetchRatingData = async () => {
    try {
      const [statsRes, ratingsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/quests/${questId}/ratings/stats`),
        fetch(`${process.env.REACT_APP_API_URL}/quests/${questId}/ratings`)
      ]);

      if (statsRes.ok && ratingsRes.ok) {
        const statsData = await statsRes.json();
        const ratingsData = await ratingsRes.json();
        
        setStats(statsData);
        setRatings(ratingsData.ratings);
        
        if (statsData.userRating) {
          setUserRating(statsData.userRating);
        }
      }
    } catch (error) {
      console.error('評価データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user || userRating === 0) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/quests/${questId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rating: userRating,
          comment: comment.trim()
        })
      });

      if (response.ok) {
        await fetchRatingData();
        setShowForm(false);
        setComment('');
        if (onRatingUpdate) {
          onRatingUpdate();
        }
      }
    } catch (error) {
      console.error('評価の送信に失敗しました:', error);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className={`stars ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={interactive ? () => setUserRating(star) : undefined}
          >
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="quest-rating-loading">評価を読み込み中...</div>;
  }

  return (
    <div className="quest-rating">
      <div className="rating-header">
        <h3>クエスト評価</h3>
        {user && !stats?.userRating && (
          <button 
            className="add-rating-btn"
            onClick={() => setShowForm(!showForm)}
          >
            評価を追加
          </button>
        )}
      </div>

      {stats && (
        <div className="rating-stats">
          <div className="average-rating">
            <div className="rating-value">{stats.averageRating.toFixed(1)}</div>
            {renderStars(Math.round(stats.averageRating))}
            <div className="rating-count">{stats.totalRatings}件の評価</div>
          </div>

          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="distribution-row">
                <span className="rating-label">{rating}★</span>
                <div className="distribution-bar">
                  <div 
                    className="distribution-fill"
                    style={{ 
                      width: `${(stats.distribution[rating] || 0) / stats.totalRatings * 100}%` 
                    }}
                  />
                </div>
                <span className="rating-count">
                  {stats.distribution[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && user && (
        <div className="rating-form">
          <div className="rating-form-stars">
            <label>評価:</label>
            {renderStars(userRating, true)}
          </div>
          <textarea
            className="rating-comment"
            placeholder="コメント（任意）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="rating-form-actions">
            <button 
              className="submit-rating"
              onClick={handleSubmitRating}
              disabled={userRating === 0}
            >
              評価を送信
            </button>
            <button 
              className="cancel-rating"
              onClick={() => {
                setShowForm(false);
                setUserRating(0);
                setComment('');
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="rating-list">
          <h4>レビュー</h4>
          {ratings.map((rating) => (
            <div key={rating.id} className="rating-item">
              <div className="rating-item-header">
                <span className="rating-username">{rating.username || '匿名'}</span>
                {renderStars(rating.rating)}
                <span className="rating-date">
                  {new Date(rating.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
              {rating.comment && (
                <p className="rating-comment-text">{rating.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestRating;