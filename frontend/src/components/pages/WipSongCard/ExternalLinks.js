import React from "react";

/**
 * Component for displaying external links (Wikipedia, Genius, Google, Apple Music, Spotify, Ultimate Guitar)
 */
const ExternalLinks = ({ editValues }) => {
  if (!editValues.album) return null;

  // Build external links for album
  // Wikipedia prefers the canonical title: "{Album} ({Artist} album)"
  const wikipediaTitle = [
    editValues.album,
    editValues.artist ? `(${editValues.artist} album)` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
    wikipediaTitle
  )}`;

  // Apple Music search for "Artist Album"
  const appleMusicQuery = [editValues.artist, editValues.album]
    .filter(Boolean)
    .join(" ");
  const appleMusicUrl = `https://music.apple.com/search?term=${encodeURIComponent(
    appleMusicQuery
  )}&media=music`;

  // Spotify search
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(
    [editValues.artist, editValues.album].filter(Boolean).join(" ")
  )}`;

  // Genius lyrics search (Artist Title)
  const geniusQuery = [editValues.artist, editValues.title]
    .filter(Boolean)
    .join(" ");
  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(
    geniusQuery
  )}`;

  // Google search (Artist Album)
  const googleQuery = [editValues.artist, editValues.album]
    .filter(Boolean)
    .join(" ");
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    googleQuery
  )}`;

  // Ultimate Guitar search (Artist Title)
  const ultimateGuitarQuery = [editValues.artist, editValues.title]
    .filter(Boolean)
    .join(" ");
  const ultimateGuitarUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(
    ultimateGuitarQuery
  )}`;

  const linkStyle = {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  };

  const separatorStyle = { color: "#ccc" };

  return (
    <>
      <a
        href={wikipediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open on Wikipedia"
        style={{ ...linkStyle, color: "#3366cc" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wikipedia badge: circular W glyph */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1px solid #3366cc",
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            fontWeight: 700,
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          W
        </span>
      </a>
      <span style={separatorStyle}>|</span>
      <a
        href={geniusUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Search lyrics on Genius"
        style={{ ...linkStyle, color: "#ffdd00" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Genius bolt-like icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2l-2 7h3l-3 13 8-10h-4l6-10z" />
        </svg>
      </a>
      <span style={separatorStyle}>|</span>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Google search"
        style={{ ...linkStyle, color: "#4285F4" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Google G */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M21.35 11.1h-8.9v2.96h5.2c-.23 1.27-1.57 3.73-5.2 3.73-3.13 0-5.68-2.59-5.68-5.78s2.55-5.78 5.68-5.78c1.78 0 2.96.75 3.64 1.39l2.48-2.39C17.19 3.8 15.2 3 13.05 3 7.99 3 3.88 7.03 3.88 12s4.11 9 9.17 9c5.3 0 8.8-3.72 8.8-8.97 0-.6-.06-1.06-.15-1.93z"
          />
        </svg>
      </a>
      <span style={separatorStyle}>|</span>
      <a
        href={appleMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open on Apple Music"
        style={{ ...linkStyle, color: "#000" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple logo SVG */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M16.365 1.43c0 1.14-.41 2.19-1.22 3.06-.98 1.09-2.15 1.74-3.45 1.64-.1-1.27.47-2.48 1.31-3.34.98-1.02 2.65-1.77 3.36-1.36-.03.13-.05.26-.05.4zM20.015 17.34c-.63 1.41-1.38 2.79-2.49 2.82-1.06.04-1.4-.67-2.61-.67-1.21 0-1.59.64-2.59.7-1.04.06-1.83-1.28-2.5-2.67-1.36-2.8-2.4-7.93.07-10.18.85-.83 1.97-1.3 3.11-1.32 1.22-.02 2.36.74 2.61.74.25 0 1.8-.92 3.03-.79 1.5.15 2.45.76 3.12 1.67-2.74 1.5-2.3 5.37.25 6.3-.24.66-.52 1.32-.9 1.8z" />
        </svg>
      </a>
      <span style={separatorStyle}>|</span>
      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open on Spotify"
        style={{ ...linkStyle, color: "#1DB954" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Spotify circle with waves */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path
            fill="#fff"
            d="M7 14c3-.8 7-.6 9.5.6.4.2.9 0 1.1-.4.2-.4 0-.9-.4-1.1C14.6 12.8 10.7 12.6 7.4 13.5c-.5.1-.8.6-.7 1 .1.4.6.7 1 .5zM7 11.3c3.5-1 8-0.8 11 .7.4.2.9 0 1.1-.4.2-.4 0-.9-.4-1.1-3.3-1.7-8.3-1.9-12.1-.8-.4.1-.7.6-.6 1 .1.4.6.7 1 .6z"
          />
        </svg>
      </a>
      <span style={separatorStyle}>|</span>
      <a
        href={ultimateGuitarUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Search on Ultimate Guitar"
        style={{ ...linkStyle, color: "#FF6B35" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Guitar icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19.59 3.59c-.38-.38-.89-.59-1.42-.59H5.83c-.53 0-1.04.21-1.42.59L2.59 5.41c-.38.38-.59.89-.59 1.42v10.34c0 .53.21 1.04.59 1.42l1.82 1.82c.38.38.89.59 1.42.59h12.34c.53 0 1.04-.21 1.42-.59l1.82-1.82c.38-.38.59-.89.59-1.42V6.83c0-.53-.21-1.04-.59-1.42L19.59 3.59zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        </svg>
      </a>
    </>
  );
};

export default ExternalLinks;