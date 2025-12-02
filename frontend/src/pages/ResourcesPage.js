import React from 'react';
import { authoringResources } from '../data/resources';

function ResourcesPage() {

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Authoring Resources</h1>
        <p style={{ color: "#666", fontSize: "1.1rem", marginTop: "0.5rem" }}>
          Essential tools, guides, and platforms for Rock Band custom song authoring
        </p>
      </div>

      <div style={{
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e9ecef",
        overflow: "hidden"
      }}>
        {authoringResources.map((resource, resourceIndex) => (
          <div
            key={resourceIndex}
            style={{
              padding: "1rem 1.5rem",
              borderBottom: resourceIndex < authoringResources.length - 1 ? "1px solid #e9ecef" : "none",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <h3 style={{ 
                    margin: "0", 
                    color: "#007bff",
                    fontSize: "1.1rem",
                    fontWeight: "600"
                  }}>
                    {resource.title}
                  </h3>
                  <span style={{
                    backgroundColor: "#e9ecef",
                    color: "#495057",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "500"
                  }}>
                    {resource.type}
                  </span>
                </div>
                
                <p style={{ 
                  color: "#666", 
                  margin: "0",
                  lineHeight: "1.4",
                  fontSize: "0.9rem"
                }}>
                  {resource.description}
                  {resource.author && (
                    <span style={{ 
                      marginLeft: "0.5rem",
                      fontStyle: "italic",
                      color: "#888"
                    }}>
                      (Credit to {resource.author})
                    </span>
                  )}
                </p>
              </div>
              
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontWeight: "500",
                  transition: "background-color 0.2s ease",
                  minWidth: "fit-content"
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
            </div>
          </div>
        ))}
      </div>
      
      <div style={{
        marginTop: "3rem",
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #dee2e6"
      }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#495057" }}>
          📝 Contributing Resources
        </h3>
        <p style={{ color: "#666", margin: "0" }}>
          Know of other useful authoring resources? Contact us through the bug report system 
          or reach out to community members to suggest additions to this list.
        </p>
      </div>
    </div>
  );
}

export default ResourcesPage;