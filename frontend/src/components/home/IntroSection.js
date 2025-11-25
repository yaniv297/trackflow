import React from 'react';
import './IntroSection.css';

const IntroSection = () => {
  return (
    <section className="intro-section">
      <div className="intro-widget">
        <h2 className="intro-title">Why TrackFlow?</h2>
        <p className="intro-description">
          TrackFlow helps you track your rhythm games custom songs progress, collaborate with other authors, and manage your songs efficiently from planning through release.
        </p>
        <div className="feature-highlights">
          <div className="feature-item">
            <strong>Smart Progress Tracking</strong> - Three-stage workflow with visual progress bars and analytics
          </div>
          <div className="feature-item">
            <strong>Real-time Collaboration</strong> - Share songs and packs with live progress updates
          </div>
          <div className="feature-item">
            <strong>Public WIPs & Community</strong> - Share your works-in-progress publicly to find collaborators
          </div>
          <div className="feature-item">
            <strong>Spotify Integration</strong> - Auto-fetch metadata, album art, and import playlists instantly
          </div>
          <div className="feature-item">
            <strong>Advanced Analytics</strong> - View top artists, albums, decades, and progress charts
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;