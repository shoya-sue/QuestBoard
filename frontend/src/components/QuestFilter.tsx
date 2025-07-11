import React from 'react';
import './QuestFilter.css';

export interface FilterOptions {
  difficulty: string;
  status: string;
  searchTerm: string;
}

interface QuestFilterProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const QuestFilter: React.FC<QuestFilterProps> = ({ filters, onFilterChange }) => {
  const handleChange = (field: keyof FilterOptions, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="quest-filter">
      <div className="filter-group">
        <label>検索</label>
        <input
          type="text"
          placeholder="クエスト名で検索..."
          value={filters.searchTerm}
          onChange={(e) => handleChange('searchTerm', e.target.value)}
        />
      </div>
      
      <div className="filter-group">
        <label>難易度</label>
        <select
          value={filters.difficulty}
          onChange={(e) => handleChange('difficulty', e.target.value)}
        >
          <option value="">全て</option>
          <option value="E">E級</option>
          <option value="D">D級</option>
          <option value="C">C級</option>
          <option value="B">B級</option>
          <option value="A">A級</option>
          <option value="S">S級</option>
          <option value="SS">SS級</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>ステータス</label>
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <option value="">全て</option>
          <option value="available">未受注</option>
          <option value="in_progress">受注中</option>
        </select>
      </div>
      
      <button
        className="clear-filters"
        onClick={() => onFilterChange({ difficulty: '', status: '', searchTerm: '' })}
      >
        フィルターをクリア
      </button>
    </div>
  );
};

export default QuestFilter;