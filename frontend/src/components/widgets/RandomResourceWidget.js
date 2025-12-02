import React, { useState, useEffect } from 'react';
import { authoringResources } from '../../data/resources';

function RandomResourceWidget() {
  const [randomResource, setRandomResource] = useState(null);

  useEffect(() => {
    // Pick a random resource on component mount
    const randomIndex = Math.floor(Math.random() * authoringResources.length);
    setRandomResource(authoringResources[randomIndex]);
  }, []);

  const getNewResource = () => {
    const randomIndex = Math.floor(Math.random() * authoringResources.length);
    setRandomResource(authoringResources[randomIndex]);
  };

  if (!randomResource) {
    return null;
  }

  return (
    <div style={{
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      border: "1px solid #e9ecef",
      padding: "1rem",
      marginBottom: "1rem"
    }}>
      <div style={{
        position: "relative",
        marginBottom: "0.75rem"
      }}>
        <h2 className="section-title" style={{
          margin: "0",
          fontSize: "1.3rem",
          textAlign: "center"
        }}>
          Featured Resource
        </h2>
        <button
          onClick={getNewResource}
          style={{
            position: "absolute",
            top: "50%",
            right: "0",
            transform: "translateY(-50%)",
            background: "none",
            border: "2px solid #ddd",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "1rem",
            color: "#666",
            transition: "all 0.2s ease",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.color = "#667eea";
            e.target.style.background = "rgba(102, 126, 234, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#ddd";
            e.target.style.color = "#666";
            e.target.style.background = "none";
          }}
          title="Next resource"
        >
          ↻
        </button>
      </div>

      <div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem"
        }}>
          <h4 style={{
            margin: "0",
            color: "#007bff",
            fontSize: "1rem",
            fontWeight: "600"
          }}>
            {randomResource.title}
          </h4>
          <span style={{
            backgroundColor: "#e9ecef",
            color: "#495057",
            padding: "0.1rem 0.4rem",
            borderRadius: "3px",
            fontSize: "0.7rem",
            fontWeight: "500"
          }}>
            {randomResource.type}
          </span>
        </div>

        <p style={{
          color: "#666",
          margin: "0 0 0.75rem 0",
          fontSize: "0.85rem",
          lineHeight: "1.4"
        }}>
          {randomResource.description}
          {randomResource.author && (
            <span style={{
              display: "block",
              marginTop: "0.25rem",
              fontStyle: "italic",
              fontSize: "0.8rem",
              color: "#888"
            }}>
              Credit to {randomResource.author}
            </span>
          )}
        </p>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={randomResource.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#007bff",
              color: "white",
              padding: "0.4rem 0.75rem",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: "500",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#007bff";
            }}
          >
            Visit ↗
          </a>
          <a
            href="/resources"
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "#007bff",
              padding: "0.4rem 0.75rem",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: "500",
              border: "1px solid #007bff",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#007bff";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#007bff";
            }}
          >
            View All
          </a>
        </div>
      </div>
    </div>
  );
}

export default RandomResourceWidget;