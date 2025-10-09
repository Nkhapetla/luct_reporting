import React, { useState, useEffect } from 'react';


const SearchBar = ({ 
  placeholder = "Search...", 
  onSearch, 
  filters = [],
  onFilterChange,
  loading = false,
  debounceDelay = 300 // ADD DEBOUNCING
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [isTyping, setIsTyping] = useState(false); // ADD TYPING STATE

  // ADD DEBOUNCE EFFECT
  useEffect(() => {
    if (query === '') {
      // If query is empty, search immediately
      if (onSearch) {
        onSearch('', selectedFilter);
      }
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(query, selectedFilter);
      }
      setIsTyping(false);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, selectedFilter, debounceDelay, onSearch]);

  const handleInputChange = (value) => {
    setQuery(value);
    // Don't call onSearch here - let the useEffect handle it with debounce
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
    // Filter change will trigger search through useEffect
  };

  const handleClear = () => {
    setQuery('');
    setSelectedFilter('');
    // Clearing will trigger search through useEffect
  };

  const showLoading = loading || isTyping;

  return (
    <div className="search-bar">
      <div className="search-input-group">
        <div className="search-icon">🔍</div>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          disabled={loading}
        />
        {query && (
          <button className="clear-btn" onClick={handleClear} disabled={loading}>
            ✕
          </button>
        )}
      </div>
      
      {filters.length > 0 && (
        <div className="filter-group">
          <select 
            className="filter-select"
            value={selectedFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            disabled={loading}
          >
            <option value="">All</option>
            {filters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {showLoading && (
        <div className="search-loading">
          <div className="spinner"></div>
          <span className="loading-text">
            {isTyping ? "Typing..." : "Searching..."}
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;