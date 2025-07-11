import React, { useState, useEffect } from 'react';
import './QuestForm.css';

interface QuestFormData {
  title: string;
  description: string;
  reward: string;
  difficulty: string;
}

interface QuestFormProps {
  initialData?: QuestFormData;
  onSubmit: (data: QuestFormData) => Promise<void>;
  onCancel: () => void;
  submitText?: string;
}

const QuestForm: React.FC<QuestFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitText = '作成' 
}) => {
  const [formData, setFormData] = useState<QuestFormData>({
    title: '',
    description: '',
    reward: '',
    difficulty: 'E'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'エラーが発生しました');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form className="quest-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">クエスト名</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">依頼内容</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={5}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reward">報酬</label>
        <input
          type="text"
          id="reward"
          name="reward"
          value={formData.reward}
          onChange={handleChange}
          placeholder="例: 1000G"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="difficulty">難易度</label>
        <select
          id="difficulty"
          name="difficulty"
          value={formData.difficulty}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="E">E級</option>
          <option value="D">D級</option>
          <option value="C">C級</option>
          <option value="B">B級</option>
          <option value="A">A級</option>
          <option value="S">S級</option>
          <option value="SS">SS級</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? '処理中...' : submitText}
        </button>
        <button type="button" onClick={onCancel} disabled={loading}>
          キャンセル
        </button>
      </div>
    </form>
  );
};

export default QuestForm;