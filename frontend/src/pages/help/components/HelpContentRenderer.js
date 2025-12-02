import React from "react";

/**
 * Component for rendering different types of help content
 */

const HelpContentRenderer = ({ section }) => {
  const sectionStyle = { marginBottom: "2.5rem" };
  const headingStyle = {
    color: "#007bff",
    borderBottom: "2px solid #007bff",
    paddingBottom: "0.5rem",
    marginBottom: "1rem",
  };
  const subHeadingStyle = {
    color: "#333",
    marginTop: "1.5rem",
    marginBottom: "0.5rem",
  };
  const textStyle = { lineHeight: "1.6", color: "#555" };
  const listStyle = { lineHeight: "1.8", color: "#555" };

  if (!section) {
    return (
      <div>Select a section from the navigation to view the guide.</div>
    );
  }

  return (
    <div>
      <h2 style={headingStyle}>{section.title}</h2>

      {section.sections.map((subSection, index) => (
        <div key={index} style={sectionStyle}>
          {subSection.title && (
            <h3 style={subHeadingStyle}>{subSection.title}</h3>
          )}
          {subSection.subsections ? (
            <div>
              {subSection.type === "paragraph" && (
                <p style={textStyle}>{subSection.content}</p>
              )}
              {subSection.subsections.map((sub, idx) => (
                <div key={idx} style={{ marginTop: idx > 0 ? "1rem" : 0 }}>
                  {sub.title && (
                    <h4 style={{ color: "#333", marginTop: idx > 0 ? "1rem" : 0 }}>
                      {sub.title}
                    </h4>
                  )}
                  {renderSubSection(sub, textStyle, listStyle)}
                </div>
              ))}
            </div>
          ) : (
            renderSubSection(subSection, textStyle, listStyle)
          )}
        </div>
      ))}
    </div>
  );
};

const renderSubSection = (subSection, textStyle, listStyle) => {
  switch (subSection.type) {
    case "paragraph":
      return <p style={textStyle}>{subSection.content}</p>;

    case "steps":
      return (
        <ol style={listStyle}>
          {subSection.content.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul style={listStyle}>
          {subSection.content.map((item, idx) => (
            <li key={idx}>
              <strong>{item.label}</strong> {item.text}
            </li>
          ))}
        </ul>
      );

    case "info-box":
      return (
        <div
          style={{
            background: "#f8f9fa",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          {subSection.content.intro && (
            <p style={textStyle}>{subSection.content.intro}</p>
          )}
          {subSection.content.items?.map((item, idx) => (
            <div key={idx} style={{ marginTop: idx > 0 ? "1rem" : 0 }}>
              {item.icon && (
                <h4 style={{ color: item.color || "#333", marginTop: 0 }}>
                  {item.icon} {item.title}
                </h4>
              )}
              {!item.icon && item.title && (
                <h4 style={{ color: "#333", marginTop: 0 }}>{item.title}</h4>
              )}
              {item.description && (
                <p style={textStyle}>
                  {Array.isArray(item.description)
                    ? item.description.map((line, i) => (
                        <React.Fragment key={i}>
                          • {line}
                          <br />
                        </React.Fragment>
                      ))
                    : item.description}
                </p>
              )}
            </div>
          ))}
          {subSection.content.tips && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ color: "#333" }}>Workflow Tips</h4>
              <ul style={listStyle}>
                {subSection.content.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

    case "highlight-box":
      return (
        <div
          style={{
            background: subSection.highlightColor || "#e7f3ff",
            padding: "1.5rem",
            borderRadius: "8px",
            border: `1px solid ${subSection.borderColor || "#b3d9ff"}`,
          }}
        >
          {subSection.content.title && (
            <h4 style={{ color: "#333", marginTop: 0 }}>
              {subSection.content.title}
            </h4>
          )}
          {subSection.content.description && (
            <p style={textStyle}>{subSection.content.description}</p>
          )}
          {subSection.content.steps && (
            <ol style={listStyle}>
              {subSection.content.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          )}
          {subSection.content.items && (
            <ul style={listStyle}>
              {subSection.content.items.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.label}</strong> {item.text}
                </li>
              ))}
            </ul>
          )}
          {subSection.content.note && (
            <p style={textStyle}>{subSection.content.note}</p>
          )}
          {subSection.content.subsections?.map((sub, idx) => (
            <div key={idx} style={{ marginTop: "1rem" }}>
              {sub.title && (
                <h4 style={{ color: "#333", marginTop: idx > 0 ? "1rem" : 0 }}>
                  {sub.title}
                </h4>
              )}
              {renderSubSection(sub, textStyle, listStyle)}
            </div>
          ))}
        </div>
      );

    case "two-column":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <div>
            <strong>{subSection.content.left.title}</strong>
            <ul style={listStyle}>
              {subSection.content.left.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>{subSection.content.right.title}</strong>
            <ul style={listStyle}>
              {subSection.content.right.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "grid":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${subSection.content.columns || 2}, 1fr)`,
            gap: "1.5rem",
          }}
        >
          {subSection.content.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: item.highlightColor || "#f8f9fa",
                padding: "1.5rem",
                borderRadius: "8px",
                border: `1px solid ${item.borderColor || "#dee2e6"}`,
              }}
            >
              <h4 style={{ color: "#333", marginTop: 0 }}>{item.title}</h4>
              <ul style={listStyle}>
                {item.items.map((subItem, subIdx) => (
                  <li key={subIdx}>
                    <strong>{subItem.label}</strong> {subItem.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case "faq":
      return (
        <div>
          {subSection.content.map((faq, idx) => (
            <div key={idx} style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                {faq.question}
              </h4>
              <p
                style={{
                  lineHeight: "1.6",
                  color: "#555",
                  marginLeft: "1rem",
                }}
              >
                {faq.answer.split("\n").map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < faq.answer.split("\n").length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            </div>
          ))}
        </div>
      );

    case "contact-box":
      return (
        <div
          style={{
            background: "#f8f9fa",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          <h3 style={{ color: "#333", marginTop: 0 }}>
            {subSection.content.title}
          </h3>
          <p style={textStyle}>{subSection.content.description}</p>
          <ul style={listStyle}>
            {subSection.content.contact.map((item, idx) => (
              <li key={idx}>
                <strong>{item.label}</strong> {item.text}
              </li>
            ))}
          </ul>
          <p
            style={{
              lineHeight: "1.6",
              color: "#555",
              marginTop: "1rem",
            }}
          >
            {subSection.content.note}
          </p>
        </div>
      );

    default:
      // Handle subsections that don't have a type but have content
      if (subSection.subsections) {
        return (
          <div>
            {subSection.subsections.map((sub, idx) => (
              <div key={idx} style={{ marginTop: idx > 0 ? "1rem" : 0 }}>
                {sub.title && (
                  <h4 style={{ color: "#333", marginTop: idx > 0 ? "1rem" : 0 }}>
                    {sub.title}
                  </h4>
                )}
                {renderSubSection(sub, textStyle, listStyle)}
              </div>
            ))}
          </div>
        );
      }
      if (subSection.items) {
        return (
          <div>
            {subSection.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: item.highlightColor || "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: `1px solid ${item.borderColor || "#b3d9ff"}`,
                  marginTop: idx > 0 ? "1rem" : 0,
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>{item.title}</h4>
                {item.steps && (
                  <ol style={listStyle}>
                    {item.steps.map((step, stepIdx) => (
                      <li key={stepIdx}>{step}</li>
                    ))}
                  </ol>
                )}
                {item.description && (
                  <p style={textStyle}>{item.description}</p>
                )}
              </div>
            ))}
          </div>
        );
      }
      // If no type and no subsections/items, return null
      return null;
  }
};

export default HelpContentRenderer;

