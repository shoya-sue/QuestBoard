import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Pagination';

describe('Pagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('ページ番号が正しく表示される', () => {
    render(
      <Pagination 
        currentPage={3} 
        totalPages={10} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('最初のページでは「前へ」ボタンが無効になる', () => {
    render(
      <Pagination 
        currentPage={1} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    const prevButton = screen.getByText('前へ');
    expect(prevButton).toBeDisabled();
  });

  it('最後のページでは「次へ」ボタンが無効になる', () => {
    render(
      <Pagination 
        currentPage={5} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    const nextButton = screen.getByText('次へ');
    expect(nextButton).toBeDisabled();
  });

  it('「次へ」ボタンクリックで次のページに移動', () => {
    render(
      <Pagination 
        currentPage={2} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('「前へ」ボタンクリックで前のページに移動', () => {
    render(
      <Pagination 
        currentPage={3} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    const prevButton = screen.getByText('前へ');
    fireEvent.click(prevButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('ページ番号ボタンクリックで該当ページに移動', () => {
    render(
      <Pagination 
        currentPage={1} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    // ページ3のボタンをクリック
    const page3Button = screen.getByText('3');
    fireEvent.click(page3Button);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('現在のページボタンにはactiveクラスが適用される', () => {
    render(
      <Pagination 
        currentPage={2} 
        totalPages={5} 
        onPageChange={mockOnPageChange} 
      />
    );
    
    const currentPageButton = screen.getByText('2');
    expect(currentPageButton).toHaveClass('active');
  });
});