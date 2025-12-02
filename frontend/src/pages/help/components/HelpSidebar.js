import React from "react";

/**
 * Sidebar navigation component for Help page
 */
const HelpSidebar = ({ sections, activeSection, onSectionChange }) => {
  return (
    <div
      style={{
        width: "250px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        padding: "1.5rem",
        height: "fit-content",
        position: "sticky",
        top: "2rem",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "#333" }}>
        Contents
      </h3>
      <nav>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem",
              margin: "0.25rem 0",
              background:
                activeSection === section.id ? "#007bff" : "transparent",
              color: activeSection === section.id ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (activeSection !== section.id) {
                e.target.style.background = "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== section.id) {
                e.target.style.background = "transparent";
              }
            }}
          >
            {section.icon} {section.title.split(" ").slice(1).join(" ")}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default HelpSidebar;
