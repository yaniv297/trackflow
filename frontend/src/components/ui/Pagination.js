import React from 'react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalCount, 
  perPage 
}) => {
  if (!totalPages || totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Calculate range
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
    }

    return rangeWithDots;
  };

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalCount);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {startItem}-{endItem} of {totalCount} results
      </div>
      
      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="pagination-btn pagination-btn-prev"
          aria-label="Previous page"
        >
          ‹ Previous
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((number, index) => (
            number === '...' ? (
              <span key={`dots-${index}`} className="pagination-dots">...</span>
            ) : (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`pagination-btn pagination-number ${
                  number === currentPage ? 'active' : ''
                }`}
                aria-label={`Go to page ${number}`}
              >
                {number}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="pagination-btn pagination-btn-next"
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;