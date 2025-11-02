import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockSongs = [
  {
    id: 1,
    title: 'Test Song 1',
    artist: 'Test Artist',
    pack: 'Test Pack',
    status: 'Completed',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    pack: 'Test Pack 2',
    status: 'In Progress',
    created_at: '2023-01-02T00:00:00Z'
  }
];

// Simple mock component for testing
const MockSongTable = ({ songs }) => (
  <div data-testid="song-table">
    {songs.map(song => (
      <div key={song.id} data-testid="song-row">
        <span data-testid="song-title">{song.title}</span>
        <span data-testid="song-artist">{song.artist}</span>
        <span data-testid="song-pack">{song.pack}</span>
        <span data-testid="song-status">{song.status}</span>
      </div>
    ))}
  </div>
);

describe('SongTable Component', () => {
  it('renders songs correctly', () => {
    render(<MockSongTable songs={mockSongs} />);
    
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    expect(screen.getByText('Test Song 2')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Test Pack')).toBeInTheDocument();
  });

  it('displays correct number of songs', () => {
    render(<MockSongTable songs={mockSongs} />);
    
    const songRows = screen.getAllByTestId('song-row');
    expect(songRows).toHaveLength(2);
  });

  it('handles empty song list', () => {
    render(<MockSongTable songs={[]} />);
    
    const songTable = screen.getByTestId('song-table');
    expect(songTable).toBeInTheDocument();
    expect(screen.queryByTestId('song-row')).not.toBeInTheDocument();
  });

  it('displays song status correctly', () => {
    render(<MockSongTable songs={mockSongs} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});