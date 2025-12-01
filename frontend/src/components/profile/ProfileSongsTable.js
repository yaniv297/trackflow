import React from 'react';
import './ProfileSongsTable.css';

const ProfileSongsTable = ({ 
  title, 
  songs, 
  currentPage, 
  onPageChange, 
  showStatus = false,
  groupByArtist,
  setGroupByArtist,
  expandedArtists,
  setExpandedArtists,
  itemsPerPage = 10
}) => {
  if (!songs || songs.length === 0) return null;

  // Group songs by artist and sort by song count (most to least)
  const groupSongsByArtist = (songs) => {
    const grouped = songs.reduce((acc, song) => {
      const artist = song.artist || 'Unknown Artist';
      if (!acc[artist]) {
        acc[artist] = [];
      }
      acc[artist].push(song);
      return acc;
    }, {});
    
    // Convert to array and sort by song count (descending)
    return Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([artist, songs]) => ({
        artist,
        songs: songs.sort((a, b) => a.title.localeCompare(b.title)), // Sort songs alphabetically within artist
        songCount: songs.length
      }));
  };

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Toggle artist expand state
  const toggleArtistCollapse = (artist) => {
    const newExpanded = new Set(expandedArtists);
    if (newExpanded.has(artist)) {
      newExpanded.delete(artist);
    } else {
      newExpanded.add(artist);
    }
    setExpandedArtists(newExpanded);
  };

  // Pagination helpers
  const paginate = (items, page, perPage = itemsPerPage) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      totalItems: items.length
    };
  };

  const renderPagination = (totalPages, currentPage, onPageChange) => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="pagination-wrapper">
        <div className="pagination">
          <button 
            onClick={() => onPageChange(1)} 
            disabled={currentPage === 1}
          >
            First
          </button>
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={currentPage === page ? 'active' : ''}
            >
              {page}
            </button>
          ))}
          
          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button 
            onClick={() => onPageChange(totalPages)} 
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  let paginatedData;
  let groupedArtists;
  
  if (groupByArtist) {
    // When grouping by artist, group first, then paginate
    groupedArtists = groupSongsByArtist(songs);
    paginatedData = paginate(groupedArtists, currentPage);
  } else {
    // When showing table view, randomize order then paginate
    const shuffledSongs = shuffleArray(songs);
    paginatedData = paginate(shuffledSongs, currentPage);
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-group">
          <h3 className="section-title">{title}</h3>
          <span className="section-count">{songs.length}</span>
        </div>
        <div className="section-controls">
          <button
            onClick={() => setGroupByArtist(!groupByArtist)}
            className={`group-toggle ${groupByArtist ? 'active' : ''}`}
            title="Toggle artist grouping"
          >
            <span className="toggle-icon">👥</span>
            Group by Artist
          </button>
        </div>
      </div>
      
      <div className="section-content songs-section">
        {groupByArtist ? (
          // Artist-grouped view
          <div className="artists-grouped-view">
            {paginatedData.items.map(({ artist, songs: artistSongs, songCount }) => {
              // Artists are collapsed by default, expanded only if explicitly expanded
              const isCollapsed = !expandedArtists.has(artist);
              
              return (
                <div key={artist} className="artist-group">
                  <div 
                    className="artist-header"
                    onClick={() => toggleArtistCollapse(artist)}
                  >
                    <div className="artist-info">
                      <span className="collapse-icon">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      <div className="artist-image-container">
                        {artistSongs[0]?.artist_image_url ? (
                          <img 
                            src={artistSongs[0].artist_image_url} 
                            alt={`${artist}`}
                            className="artist-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="artist-image-placeholder" 
                          style={{ display: artistSongs[0]?.artist_image_url ? 'none' : 'flex' }}
                        >
                          🎤
                        </div>
                      </div>
                      <div className="artist-details">
                        <h4 className="artist-name">{artist}</h4>
                        <span className="song-count">({songCount} song{songCount !== 1 ? 's' : ''})</span>
                      </div>
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="artist-songs">
                      {artistSongs.map((song) => (
                        <div key={song.id} className="song-item">
                          <div className="song-artwork">
                            {song.album_cover ? (
                              <img 
                                src={song.album_cover} 
                                alt={`${song.album || 'Album'} cover`}
                                className="album-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="album-cover-placeholder"
                              style={{ display: song.album_cover ? 'none' : 'flex' }}
                            >
                              ♪
                            </div>
                          </div>
                          
                          <div className="song-details">
                            <div className="song-title-block">
                              <div className="song-title">{song.title}</div>
                              <div className="song-album">
                                {song.album || 'No Album'}
                              </div>
                            </div>
                            <div className="song-meta">
                              {showStatus && (
                                <span className={`status-badge ${song.status?.toLowerCase().replace(' ', '-')}`}>
                                  {song.status}
                                </span>
                              )}
                              {song.pack_name && (
                                <span className="pack-name">{song.pack_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Table view with album art
          <div className="songs-table-wrapper">
            <table className="songs-table">
              <thead>
                <tr>
                  <th className="artwork-col"></th>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>Pack</th>
                  {showStatus && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedData.items.map((song) => (
                  <tr key={song.id}>
                    <td className="artwork-col">
                      <div className="table-artwork">
                        {song.album_cover ? (
                          <img 
                            src={song.album_cover} 
                            alt={`${song.album || 'Album'} cover`}
                            className="table-album-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="table-album-cover-placeholder"
                          style={{ display: song.album_cover ? 'none' : 'flex' }}
                        >
                          ♪
                        </div>
                      </div>
                    </td>
                    <td className="song-title">{song.title}</td>
                    <td>{song.artist}</td>
                    <td>{song.album || 'N/A'}</td>
                    <td>{song.pack_name || ''}</td>
                    {showStatus && (
                      <td>
                        <span className={`status-badge ${song.status?.toLowerCase().replace(' ', '-')}`}>
                          {song.status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {renderPagination(
          paginatedData.totalPages, 
          paginatedData.currentPage, 
          onPageChange
        )}
      </div>
    </div>
  );
};

export default ProfileSongsTable;