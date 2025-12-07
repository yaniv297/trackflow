import React from 'react';
import './PublicSongFilters.css';

/**
 * Filters component for public songs browsing
 */
const PublicSongFilters = ({
  filters,
  onFiltersChange,
  isLoading
}) => {

  const handleInputChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: ''
    });
  };

  const hasActiveFilters = filters.search;

  return (
    <div className="public-song-filters">
      {hasActiveFilters && (
        <div className="filters-header">
          <button 
            onClick={clearFilters}
            className="clear-filters-btn"
            disabled={isLoading}
          >
            Clear Filters
          </button>
        </div>
      )}

      <div className="filters-grid">
        {/* Search */}
        <div className="filter-group">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Search songs, artists, or authors..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            disabled={isLoading}
            className="filter-input"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          {filters.search && (
            <span className="filter-tag">
              Search: "{filters.search}"
              <button 
                onClick={() => handleInputChange('search', '')}
                className="remove-filter"
                disabled={isLoading}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicSongFilters;