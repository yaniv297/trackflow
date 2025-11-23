import React, { useState } from "react";
import { helpSections } from "./data";
import HelpSidebar from "./components/HelpSidebar";
import HelpContentRenderer from "./components/HelpContentRenderer";

function HelpPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = helpSections.map((section) => ({
    id: section.id,
    title: section.title,
    icon: section.title.split(" ")[0], // Extract emoji
  }));

  const currentSection = helpSections.find(
    (section) => section.id === activeSection
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>TrackFlow User Guide</h1>
      </div>

      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Sidebar Navigation */}
        <HelpSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "2rem",
            minHeight: "800px",
          }}
        >
          <HelpContentRenderer section={currentSection} />
        </div>
      </div>
    </div>
  );
}

export default HelpPage;

