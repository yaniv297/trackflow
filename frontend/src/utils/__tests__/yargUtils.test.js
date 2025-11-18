import { generateYargIni } from '../yargUtils';

describe('YARG Utils', () => {
  const mockSong = {
    title: 'Test Song',
    artist: 'Test Artist', 
    album: 'Test Album',
    year: 2024
  };

  const mockUser = {
    username: 'testuser'
  };

  test('generates basic INI without collaborations', () => {
    const ini = generateYargIni(mockSong, mockUser);
    
    expect(ini).toContain('name = Test Song');
    expect(ini).toContain('artist = Test Artist');
    expect(ini).toContain('album = Test Album');
    expect(ini).toContain('year = 2024');
    expect(ini).toContain('charter = testuser');
    expect(ini).toContain('charter_guitar = testuser');
  });

  test('generates INI with collaborations using fuzzy matching', () => {
    const collaborations = [
      { field: 'Drums', collaborator: 'jphn' },
      { field: 'Vocals', collaborator: 'jphn' },
      { field: 'Bass', collaborator: 'yaniv297' }
    ];
    
    const ini = generateYargIni(mockSong, mockUser, collaborations);
    
    expect(ini).toContain('charter_drums = jphn');
    expect(ini).toContain('charter_vocals = jphn');
    expect(ini).toContain('charter_bass = yaniv297');
    expect(ini).toContain('charter_guitar = testuser'); // fallback to owner
  });

  test('fuzzy matches field names case-insensitively', () => {
    const collaborations = [
      { field: 'DRUMS', collaborator: 'drummer1' },
      { field: 'vocals', collaborator: 'singer1' },
      { field: 'Guitar', collaborator: 'guitarist1' },
      { field: 'rhythm guitar', collaborator: 'rhythm1' }
    ];
    
    const ini = generateYargIni(mockSong, mockUser, collaborations);
    
    expect(ini).toContain('charter_drums = drummer1');
    expect(ini).toContain('charter_vocals = singer1'); 
    expect(ini).toContain('charter_guitar = guitarist1');
    expect(ini).toContain('charter_rhythm = rhythm1');
  });

  test('handles empty values gracefully', () => {
    const emptySong = {
      title: '',
      artist: null,
      album: undefined,
      year: ''
    };
    
    const ini = generateYargIni(emptySong);
    
    expect(ini).toContain('name = ');
    expect(ini).toContain('artist = ');
    expect(ini).toContain('album = ');
    expect(ini).toContain('year = ');
  });
});