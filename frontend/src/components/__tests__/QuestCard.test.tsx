import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestCard from '../QuestCard';

const mockQuest = {
  id: 'quest-1',
  title: 'テストクエスト',
  description: 'これはテスト用のクエストです',
  status: 'available' as const,
  reward: '100ゴールド',
  difficulty: 'easy',
  mdFilePath: '/data/quests/quest-1.md'
};

describe('QuestCard', () => {
  it('クエスト情報が正しく表示される', () => {
    render(<QuestCard quest={mockQuest} onClick={() => {}} selected={false} />);
    
    expect(screen.getByText('テストクエスト')).toBeInTheDocument();
    expect(screen.getByText('これはテスト用のクエストです')).toBeInTheDocument();
    expect(screen.getByText('報酬: 100ゴールド')).toBeInTheDocument();
    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getByText('受注可能')).toBeInTheDocument();
  });

  it('クリック時にonClickが呼ばれる', () => {
    const handleClick = jest.fn();
    const { container } = render(<QuestCard quest={mockQuest} onClick={handleClick} selected={false} />);
    
    fireEvent.click(container.firstChild!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('選択時に適切なクラスが適用される', () => {
    const { container } = render(<QuestCard quest={mockQuest} onClick={() => {}} selected={true} />);
    
    expect(container.firstChild).toHaveClass('selected');
  });

  it('ステータスごとに適切な表示がされる', () => {
    const inProgressQuest = { ...mockQuest, status: 'in_progress' as const };
    const { rerender } = render(<QuestCard quest={inProgressQuest} onClick={() => {}} selected={false} />);
    expect(screen.getByText('受注中')).toBeInTheDocument();

    const completedQuest = { ...mockQuest, status: 'completed' as const };
    rerender(<QuestCard quest={completedQuest} onClick={() => {}} selected={false} />);
    expect(screen.getByText('達成済み')).toBeInTheDocument();
  });

  it('難易度ごとに適切なクラスが適用される', () => {
    const { container } = render(<QuestCard quest={mockQuest} onClick={() => {}} selected={false} />);
    const difficultyElement = container.querySelector('.quest-difficulty');
    
    expect(difficultyElement).toHaveClass('quest-difficulty');
    expect(difficultyElement).toHaveTextContent('easy');
  });
});