import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestFilter from '../QuestFilter';

describe('QuestFilter', () => {
  const mockOnFilterChange = jest.fn();
  const defaultFilters = {
    difficulty: '',
    status: '',
    searchTerm: ''
  };

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('フィルター要素が正しく表示される', () => {
    render(<QuestFilter filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
    
    expect(screen.getByPlaceholderText('クエスト名で検索...')).toBeInTheDocument();
    expect(screen.getByText('全て')).toBeInTheDocument();
    expect(screen.getByText('未受注')).toBeInTheDocument();
  });

  it('検索入力が変更されたときにonFilterChangeが呼ばれる', () => {
    render(<QuestFilter filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('クエスト名で検索...');
    fireEvent.change(searchInput, { target: { value: 'ドラゴン' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchTerm: 'ドラゴン'
    });
  });

  it('難易度選択が変更されたときにonFilterChangeが呼ばれる', () => {
    render(<QuestFilter filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
    
    const selects = screen.getAllByRole('combobox');
    const difficultySelect = selects[0]; // 最初のselectが難易度
    fireEvent.change(difficultySelect, { target: { value: 'A' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      difficulty: 'A'
    });
  });

  it('ステータス選択が変更されたときにonFilterChangeが呼ばれる', () => {
    render(<QuestFilter filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
    
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[1]; // 2番目のselectがステータス
    fireEvent.change(statusSelect, { target: { value: 'available' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      status: 'available'
    });
  });

  it('リセットボタンがクリックされたときにフィルターがクリアされる', () => {
    const activeFilters = {
      difficulty: 'hard',
      status: 'available',
      searchTerm: 'ドラゴン'
    };
    
    render(<QuestFilter filters={activeFilters} onFilterChange={mockOnFilterChange} />);
    
    const resetButton = screen.getByText('リセット');
    fireEvent.click(resetButton);
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      difficulty: '',
      status: '',
      searchTerm: ''
    });
  });
});