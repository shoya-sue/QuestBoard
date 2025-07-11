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
    expect(screen.getByText('すべての難易度')).toBeInTheDocument();
    expect(screen.getByText('すべてのステータス')).toBeInTheDocument();
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
    
    const difficultySelect = screen.getByDisplayValue('すべての難易度');
    fireEvent.change(difficultySelect, { target: { value: 'hard' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      difficulty: 'hard'
    });
  });

  it('ステータス選択が変更されたときにonFilterChangeが呼ばれる', () => {
    render(<QuestFilter filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
    
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
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