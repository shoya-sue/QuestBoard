import React, { useState, useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
}

interface SearchFilters {
  category?: string;
  difficulty?: string;
  status?: string;
  sortBy?: string;
}

interface Suggestion {
  text: string;
  type: 'quest' | 'user';
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'クエストを検索...',
  showFilters = true
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // API から suggestions を取得
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/search/suggestions?q=${encodeURIComponent(searchQuery)}&type=quest`
        );
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        setSuggestions(
          data.suggestions.map((text: string) => ({
            text,
            type: 'quest' as const
          }))
        );
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (query) {
      fetchSuggestions(query);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, fetchSuggestions]);

  // クリック外側でサジェストを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(query, filters);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    onSearch(suggestion.text, filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    if (query) {
      onSearch(query, newFilters);
    }
  };

  return (
    <div className="search-bar" ref={searchRef}>
      <form onSubmit={handleSearch} className="search-bar__form">
        <div className="search-bar__input-wrapper">
          <input
            type="text"
            className="search-bar__input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && setShowSuggestions(true)}
          />
          <button type="submit" className="search-bar__button">
            <svg className="search-bar__icon" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
          {isLoading && <div className="search-bar__loader" />}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="search-bar__suggestions">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`search-bar__suggestion ${
                  index === selectedSuggestionIndex ? 'search-bar__suggestion--selected' : ''
                }`}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <svg className="search-bar__suggestion-icon" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <span className="search-bar__suggestion-text">{suggestion.text}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      {showFilters && (
        <div className="search-bar__filters">
          <select
            className="search-bar__filter"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">全カテゴリ</option>
            <option value="development">開発</option>
            <option value="design">デザイン</option>
            <option value="management">管理</option>
            <option value="other">その他</option>
          </select>

          <select
            className="search-bar__filter"
            value={filters.difficulty || ''}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="">全難易度</option>
            <option value="easy">簡単</option>
            <option value="medium">普通</option>
            <option value="hard">難しい</option>
          </select>

          <select
            className="search-bar__filter"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">全ステータス</option>
            <option value="open">募集中</option>
            <option value="in_progress">進行中</option>
            <option value="completed">完了</option>
          </select>

          <select
            className="search-bar__filter"
            value={filters.sortBy || 'relevance'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="relevance">関連度順</option>
            <option value="newest">新着順</option>
            <option value="reward">報酬順</option>
            <option value="difficulty">難易度順</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default SearchBar;