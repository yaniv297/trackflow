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
      search: '',
      status: ''
    });
  };

  const hasActiveFilters = filters.search || filters.status;

  return (
    <div className="public-song-filters">
      <div className="filters-header">
        <h3>🔍 Browse Public Songs</h3>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="clear-filters-btn"
            disabled={isLoading}
          >
            Clear Filters
          </button>
        )}
      </div>

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

        {/* Status */}
        <div className="filter-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            disabled={isLoading}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="Future Plans">Future Plans</option>
            <option value="In Progress">In Progress</option>
            <option value="Released">Released</option>
          </select>
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
          {filters.status && (
            <span className="filter-tag">
              Status: "{filters.status}"
              <button 
                onClick={() => handleInputChange('status', '')}
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