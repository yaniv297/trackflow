import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Test utility functions and components
describe('Utility Functions', () => {
  // Test string formatting utility
  const formatSongTitle = (title) => {
    return title.toLowerCase().replace(/\s+/g, '-');
  };

  it('formats song title correctly', () => {
    expect(formatSongTitle('My Great Song')).toBe('my-great-song');
    expect(formatSongTitle('Song with   spaces')).toBe('song-with-spaces');
  });

  // Test status formatting
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#28a745';
      case 'In Progress': return '#ffc107';
      case 'Future Plans': return '#6c757d';
      default: return '#6c757d';
    }
  };

  it('returns correct status colors', () => {
    expect(getStatusColor('Completed')).toBe('#28a745');
    expect(getStatusColor('In Progress')).toBe('#ffc107');
    expect(getStatusColor('Future Plans')).toBe('#6c757d');
    expect(getStatusColor('Unknown')).toBe('#6c757d');
  });

  // Test date formatting
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  it('formats dates correctly', () => {
    const testDate = '2023-01-01T00:00:00Z';
    const formatted = formatDate(testDate);
    expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

// Test simple React components
describe('Simple Components', () => {
  const StatusBadge = ({ status }) => (
    <span 
      data-testid="status-badge" 
      style={{ color: '#fff', backgroundColor: '#007bff', padding: '4px 8px', borderRadius: '4px' }}
    >
      {status}
    </span>
  );

  it('renders status badge', () => {
    render(<StatusBadge status="Completed" />);
    
    const badge = screen.getByTestId('status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Completed');
  });

  const SongCounter = ({ count }) => (
    <div data-testid="song-counter">
      {count} {count === 1 ? 'song' : 'songs'}
    </div>
  );

  it('displays correct song count singular', () => {
    render(<SongCounter count={1} />);
    expect(screen.getByText('1 song')).toBeInTheDocument();
  });

  it('displays correct song count plural', () => {
    render(<SongCounter count={5} />);
    expect(screen.getByText('5 songs')).toBeInTheDocument();
  });
});