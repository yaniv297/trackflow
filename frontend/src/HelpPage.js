import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function HelpPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    { id: "getting-started", title: "🚀 Getting Started", icon: "🚀" },
    { id: "songs-packs", title: "🎵 Songs & Packs", icon: "🎵" },
    { id: "statuses-workflow", title: "📋 Statuses & Workflow", icon: "📋" },
    { id: "collaboration", title: "🤝 Collaboration", icon: "🤝" },
    { id: "spotify-features", title: "🎧 Spotify Features", icon: "🎧" },
    { id: "bulk-operations", title: "⚡ Bulk Operations", icon: "⚡" },
    { id: "album-series", title: "📀 Album Series", icon: "📀" },
    { id: "faq", title: "❓ FAQ", icon: "❓" },
  ];

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <h1>TrackFlow User Guide</h1>
      </div>

      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Sidebar Navigation */}
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
                onClick={() => setActiveSection(section.id)}
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
                {section.icon}{" "}
                {section.title.replace(/^🚀|🎵|📋|🤝|🎧|⚡|📀|🔧|❓ /, "")}
              </button>
            ))}
          </nav>
        </div>

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
          {renderContent()}
        </div>
      </div>
    </div>
  );

  function renderContent() {
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

    switch (activeSection) {
      case "getting-started":
        return (
          <div>
            <h2 style={headingStyle}>🚀 Getting Started</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>What is TrackFlow?</h3>
              <p style={textStyle}>
                TrackFlow is a comprehensive project management system designed
                for Rock Band custom song authoring. It helps you track your
                authoring progress, collaborate with other authors, and manage
                multiple songs and packs efficiently from initial planning
                through final release.
              </p>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Understanding Song Statuses</h3>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                }}
              >
                <p style={textStyle}>
                  TrackFlow organizes your songs into three statuses that
                  represent different stages of your authoring process:
                </p>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#6c757d", marginTop: 0 }}>
                    🗓️ Future Plans
                  </h4>
                  <p style={textStyle}>
                    Songs you're planning to work on but haven't started yet.
                    This is your backlog of ideas and planned projects. New
                    songs start here automatically.
                  </p>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#007bff", marginTop: 0 }}>
                    ⚡ In Progress (WIP)
                  </h4>
                  <p style={textStyle}>
                    Songs you're actively working on. These appear on your WIP
                    page with progress tracking and workflow steps. This is
                    where you'll spend most of your time authoring.
                  </p>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#28a745", marginTop: 0 }}>
                    ✅ Released
                  </h4>
                  <p style={textStyle}>
                    Completed songs that are finished and published. These
                    represent your completed work and achievements.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Your First Steps</h3>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  1. Create Your First Song
                </h4>
                <p style={textStyle}>
                  • Click the <strong>"New +"</strong> button in the navigation
                  <br />• Select <strong>"New Song"</strong> to create a single
                  track
                  <br />
                  • Enter the song title and artist
                  <br />
                  • Choose or create a pack to organize it
                  <br />
                  • The song will automatically be enhanced with Spotify
                  metadata
                  <br />• Your new song will appear in{" "}
                  <strong>Future Plans</strong>
                </p>

                <h4 style={{ color: "#333" }}>2. Create Your First Pack</h4>
                <p style={textStyle}>
                  • Click <strong>"New +"</strong> → <strong>"New Pack"</strong>{" "}
                  for multiple songs
                  <br />• Choose <strong>"Single Artist"</strong> mode for one
                  artist, multiple songs
                  <br />• Or <strong>"Mixed Artists"</strong> mode using "Artist
                  - Title" format
                  <br />
                  • All songs will be grouped together for easy management
                  <br />• All new songs start in <strong>
                    Future Plans
                  </strong>{" "}
                  status
                </p>

                <h4 style={{ color: "#333" }}>3. Start Working on Songs</h4>
                <p style={textStyle}>
                  • Go to the <strong>Future Plans</strong> page to see your
                  planned songs
                  <br />
                  • Select songs you want to work on
                  <br />• Click the <strong>"Start Work"</strong> button to move
                  them to WIP
                  <br />• Your songs will now appear on the{" "}
                  <strong>WIP page</strong> with progress tracking
                </p>

                <h4 style={{ color: "#333" }}>4. Track Your Progress</h4>
                <p style={textStyle}>
                  • Navigate to the <strong>WIP (Work In Progress)</strong> page
                  <br />
                  • Check off workflow steps as you complete them
                  <br />
                  • Watch your progress bars fill up
                  <br />• Celebrate when you complete songs! 🎉
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Quick Tour: Main Navigation</h3>
              <ul style={listStyle}>
                <li>
                  <strong>WIP:</strong> Your main workspace - songs you're
                  actively working on
                </li>
                <li>
                  <strong>Future Plans:</strong> Songs in planning stage, not
                  yet started
                </li>
                <li>
                  <strong>Released:</strong> Completed songs you've finished
                </li>
                <li>
                  <strong>Album Series:</strong> Manage complete album
                  collections
                </li>
                <li>
                  <strong>Stats:</strong> View your progress analytics and
                  completion rates
                </li>
                <li>
                  <strong>Settings:</strong> Customize your workflow and profile
                </li>
              </ul>
            </section>
          </div>
        );

      case "songs-packs":
        return (
          <div>
            <h2 style={headingStyle}>🎵 Songs & Packs</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Understanding Songs</h3>
              <p style={textStyle}>
                Songs are individual tracks in your authoring pipeline. Each
                song has a title, artist, and belongs to a pack.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Creating Songs
              </h4>
              <ul style={listStyle}>
                <li>
                  <strong>Single Song:</strong> Use "New +" → "New Song" for
                  individual tracks
                </li>
                <li>
                  <strong>Bulk Creation:</strong> Use "New +" → "New Pack" to
                  create multiple songs at once
                </li>
                <li>
                  <strong>Spotify Import:</strong> Use "Import from Spotify" to
                  import entire playlists
                </li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Song Properties
              </h4>
              <ul style={listStyle}>
                <li>
                  <strong>Basic Info:</strong> Title, Artist, Album, Year
                </li>
                <li>
                  <strong>Pack Assignment:</strong> Which collection the song
                  belongs to
                </li>
                <li>
                  <strong>Status:</strong> Future Plans, In Progress, or
                  Released
                </li>
                <li>
                  <strong>Optional/Required:</strong> Mark songs as optional for
                  pack completion
                </li>
                <li>
                  <strong>Cover Art:</strong> Automatically fetched from Spotify
                </li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Understanding Packs</h3>
              <p style={textStyle}>
                Packs are collections of related songs, typically representing
                albums, artist discographies, or themed compilations.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Pack Features
              </h4>
              <ul style={listStyle}>
                <li>
                  <strong>Organization:</strong> Group songs by album, artist,
                  or theme
                </li>
                <li>
                  <strong>Progress Tracking:</strong> See completion percentage
                  across all songs
                </li>
                <li>
                  <strong>Bulk Operations:</strong> Release entire packs when
                  complete
                </li>
                <li>
                  <strong>Collaboration:</strong> Share entire packs with other
                  authors
                </li>
                <li>
                  <strong>Album Series:</strong> Convert packs to album series
                  for advanced organization
                </li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Pack Management
              </h4>
              <ul style={listStyle}>
                <li>
                  <strong>Create:</strong> When adding songs, specify pack name
                  (creates if doesn't exist)
                </li>
                <li>
                  <strong>Rename:</strong> Click pack name to edit
                </li>
                <li>
                  <strong>Release:</strong> Move completed songs to Released
                  status
                </li>
                <li>
                  <strong>Move to Future:</strong> Send entire packs back to
                  planning stage
                </li>
                <li>
                  <strong>Delete:</strong> Remove packs and all contained songs
                </li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Song Editing & Management</h3>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>Quick Edit</h4>
                <p style={textStyle}>
                  Click any song field to edit in-place. Changes save
                  automatically.
                </p>

                <h4 style={{ color: "#333" }}>Spotify Enhancement</h4>
                <p style={textStyle}>
                  Click "Enhance" to search Spotify for better metadata, album
                  art, and release year. Choose from multiple matches if
                  available.
                </p>

                <h4 style={{ color: "#333" }}>Optional Songs</h4>
                <p style={textStyle}>
                  Mark songs as "optional" - these don't count toward pack
                  completion but can still be worked on. Useful for bonus tracks
                  or alternate versions.
                </p>
              </div>
            </section>
          </div>
        );

      case "statuses-workflow":
        return (
          <div>
            <h2 style={headingStyle}>📋 Song Statuses & Workflow</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>The Three Statuses</h3>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                }}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ color: "#6c757d", marginTop: 0 }}>
                    🗓️ Future Plans
                  </h4>
                  <p style={textStyle}>
                    Songs you're planning to work on but haven't started yet.
                    This is your backlog of ideas and planned projects.
                  </p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ color: "#007bff", marginTop: 0 }}>
                    ⚡ In Progress (WIP)
                  </h4>
                  <p style={textStyle}>
                    Songs you're actively working on. These appear on your WIP
                    page with workflow tracking, progress bars, and completion
                    percentages.
                  </p>
                </div>

                <div>
                  <h4 style={{ color: "#28a745", marginTop: 0 }}>
                    ✅ Released
                  </h4>
                  <p style={textStyle}>
                    Completed songs that are finished and published. These
                    represent your completed work and achievements.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Moving Between Statuses</h3>
              <ul style={listStyle}>
                <li>
                  <strong>Future → WIP:</strong> Use "Start Work" button or move
                  individual songs
                </li>
                <li>
                  <strong>WIP → Released:</strong> Complete all workflow steps,
                  then release the pack
                </li>
                <li>
                  <strong>Released → Future:</strong> Use "Move to Future Plans"
                  to reopen completed work
                </li>
                <li>
                  <strong>Individual Songs:</strong> Edit song status directly
                  in song details
                </li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Custom Workflows</h3>
              <p style={textStyle}>
                <strong>Every user has their own custom workflow</strong> - the
                specific steps they need to complete for each song.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Setting Up Your Workflow
              </h4>
              <ul style={listStyle}>
                <li>
                  <strong>Access:</strong> Go to Settings → Workflow
                </li>
                <li>
                  <strong>Add Steps:</strong> Click "Add Step" and name your
                  custom steps
                </li>
                <li>
                  <strong>Reorder:</strong> Drag and drop to arrange steps in
                  your preferred order
                </li>
                <li>
                  <strong>Rename:</strong> Click any step name to edit it
                </li>
                <li>
                  <strong>Remove:</strong> Delete steps you don't need
                </li>
                <li>
                  <strong>Reset:</strong> Return to default workflow anytime
                </li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Common Workflow Steps
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                <div>
                  <strong>Audio Processing:</strong>
                  <ul style={listStyle}>
                    <li>Demucs (stem separation)</li>
                    <li>MIDI extraction</li>
                    <li>Tempo mapping</li>
                  </ul>
                </div>
                <div>
                  <strong>Instrument Authoring:</strong>
                  <ul style={listStyle}>
                    <li>Drums</li>
                    <li>Bass</li>
                    <li>Guitar</li>
                    <li>Vocals</li>
                    <li>Harmonies</li>
                    <li>Pro Keys</li>
                  </ul>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Managing WIP Songs</h3>
              <div
                style={{
                  background: "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  The WIP Page - Your Main Workspace
                </h4>
                <ul style={listStyle}>
                  <li>
                    <strong>Progress Tracking:</strong> Click workflow
                    checkboxes to mark steps complete
                  </li>
                  <li>
                    <strong>Visual Progress:</strong> Progress bars show
                    completion percentage
                  </li>
                  <li>
                    <strong>Pack View:</strong> Songs grouped by pack with
                    pack-level progress
                  </li>
                  <li>
                    <strong>Completion View:</strong> Songs grouped by how
                    complete they are
                  </li>
                  <li>
                    <strong>Celebrations:</strong> 🎉 Fireworks when you
                    complete songs!
                  </li>
                  <li>
                    <strong>Quick Actions:</strong> Edit, delete, enhance, or
                    collaborate on songs
                  </li>
                </ul>

                <h4 style={{ color: "#333" }}>Workflow Tips</h4>
                <ul style={listStyle}>
                  <li>
                    Check off steps as you complete them - don't wait until the
                    end
                  </li>
                  <li>
                    Use the progress bars to prioritize which songs to focus on
                  </li>
                  <li>Customize your workflow to match your actual process</li>
                  <li>
                    Add new steps when you discover new parts of your process
                  </li>
                </ul>
              </div>
            </section>
          </div>
        );

      case "collaboration":
        return (
          <div>
            <h2 style={headingStyle}>🤝 Collaboration</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>How Collaboration Works</h3>
              <p style={textStyle}>
                TrackFlow supports both pack-level and song-level collaboration.
                All collaborators work with the same workflow as defined by the
                song owner, ensuring everyone is aligned on the required steps.
              </p>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  marginTop: "1rem",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  Pack Collaboration
                </h4>
                <ul style={listStyle}>
                  <li>
                    <strong>View Access:</strong> Collaborators can see all
                    songs in the pack
                  </li>
                  <li>
                    <strong>Edit Access:</strong> Collaborators can modify any
                    song in the pack
                  </li>
                  <li>
                    <strong>Owner's Workflow:</strong> All songs use the
                    workflow defined by their respective owners
                  </li>
                  <li>
                    <strong>Shared Progress:</strong> Everyone can see each
                    other's completion status
                  </li>
                </ul>

                <h4 style={{ color: "#333" }}>Song Collaboration</h4>
                <ul style={listStyle}>
                  <li>
                    <strong>Specific Songs:</strong> Share individual songs
                    without sharing the entire pack
                  </li>
                  <li>
                    <strong>Edit Access:</strong> Collaborators can modify only
                    the specific songs shared
                  </li>
                  <li>
                    <strong>Owner's Workflow:</strong> Collaborators use the
                    workflow steps defined by the song owner
                  </li>
                  <li>
                    <strong>Targeted Work:</strong> Perfect for specialists
                    working on specific tracks
                  </li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Adding Collaborators</h3>
              <div
                style={{
                  background: "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  Step-by-Step Process
                </h4>
                <ol style={listStyle}>
                  <li>Navigate to the song or pack you want to share</li>
                  <li>
                    Click the <strong>"Add Collaborator"</strong> button
                  </li>
                  <li>Choose an existing user from the dropdown</li>
                  <li>Select the permission level (View or Edit)</li>
                  <li>
                    The collaborator will immediately see the shared content
                  </li>
                </ol>

                <h4 style={{ color: "#333" }}>Permission Levels</h4>
                <ul style={listStyle}>
                  <li>
                    <strong>View:</strong> Can see songs and progress but cannot
                    edit
                  </li>
                  <li>
                    <strong>Edit:</strong> Can modify songs, update workflow
                    steps, and change details
                  </li>
                </ul>
              </div>
            </section>
          </div>
        );

      case "spotify-features":
        return (
          <div>
            <h2 style={headingStyle}>🎧 Spotify Features</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Automatic Enhancement</h3>
              <p style={textStyle}>
                TrackFlow automatically enhances new songs with Spotify
                metadata, making data entry faster and more accurate.
              </p>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  What Gets Enhanced
                </h4>
                <ul style={listStyle}>
                  <li>
                    <strong>Album Information:</strong> Official album name and
                    release year
                  </li>
                  <li>
                    <strong>Cover Art:</strong> High-quality album artwork
                    automatically downloaded
                  </li>
                  <li>
                    <strong>Metadata:</strong> Correct artist names, featuring
                    artists, and track details
                  </li>
                  <li>
                    <strong>Title Cleaning:</strong> Removes remaster tags and
                    extra text for cleaner titles
                  </li>
                </ul>

                <h4 style={{ color: "#333" }}>When It Happens</h4>
                <ul style={listStyle}>
                  <li>
                    <strong>New Songs:</strong> Automatically when you create
                    individual songs
                  </li>
                  <li>
                    <strong>Pack Creation:</strong> All songs in new packs are
                    enhanced automatically
                  </li>
                  <li>
                    <strong>Spotify Import:</strong> Songs imported from
                    playlists come pre-enhanced
                  </li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Manual Enhancement</h3>
              <p style={textStyle}>
                Sometimes you need to find better Spotify matches or enhance
                songs that weren't automatically processed.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                How to Enhance Manually
              </h4>
              <ol style={listStyle}>
                <li>
                  Click the <strong>"Enhance"</strong> button on any song
                </li>
                <li>
                  TrackFlow searches Spotify for matches based on title and
                  artist
                </li>
                <li>
                  If multiple matches are found, you'll see a selection dialog
                </li>
                <li>Choose the best match from the list</li>
                <li>The song is updated with the selected Spotify data</li>
              </ol>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Spotify Playlist Import
              </h4>
              <div
                style={{
                  background: "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>Import Process</h4>
                <ol style={listStyle}>
                  <li>
                    Navigate to <strong>"Import from Spotify"</strong> in the
                    main menu
                  </li>
                  <li>Paste a Spotify playlist URL</li>
                  <li>
                    Choose whether to create a new pack or add to existing pack
                  </li>
                  <li>All songs are imported with full Spotify metadata</li>
                  <li>
                    Songs are automatically enhanced with cover art and album
                    information
                  </li>
                </ol>
              </div>
            </section>
          </div>
        );

      case "bulk-operations":
        return (
          <div>
            <h2 style={headingStyle}>⚡ Bulk Operations</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Bulk Selection</h3>
              <p style={textStyle}>
                Select multiple songs across different packs to perform batch
                operations efficiently. Bulk operations are available on the{" "}
                <strong>Future Plans and Released pages</strong>.
              </p>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  How to Select Songs
                </h4>
                <ul style={listStyle}>
                  <li>
                    <strong>Individual Selection:</strong> Click checkboxes next
                    to song titles
                  </li>
                  <li>
                    <strong>Select All:</strong> Use the header checkbox to
                    select all visible songs
                  </li>
                  <li>
                    <strong>Cross-Pack Selection:</strong> Select songs from
                    different packs for batch operations
                  </li>
                  <li>
                    <strong>Pack-Level Selection:</strong> Select entire packs
                    at once
                  </li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Available Operations</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                }}
              >
                <div
                  style={{
                    background: "#e7f3ff",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    border: "1px solid #b3d9ff",
                  }}
                >
                  <h4 style={{ color: "#333", marginTop: 0 }}>
                    📝 Bulk Editing
                  </h4>
                  <ul style={listStyle}>
                    <li>
                      <strong>Artist:</strong> Change artist for multiple songs
                    </li>
                    <li>
                      <strong>Album:</strong> Update album name across songs
                    </li>
                    <li>
                      <strong>Year:</strong> Set release year for multiple
                      tracks
                    </li>
                    <li>
                      <strong>Pack:</strong> Move songs to different packs
                    </li>
                    <li>
                      <strong>Album Art:</strong> Update cover art using an
                      artwork link
                    </li>
                  </ul>
                </div>

                <div
                  style={{
                    background: "#f0f9f0",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    border: "1px solid #c3e6c3",
                  }}
                >
                  <h4 style={{ color: "#333", marginTop: 0 }}>
                    🔄 Status Operations
                  </h4>
                  <ul style={listStyle}>
                    <li>
                      <strong>Start Work:</strong> Move songs from Future Plans
                      to WIP
                    </li>
                    <li>
                      <strong>Release Songs:</strong> Mark completed songs as
                      Released
                    </li>
                    <li>
                      <strong>Back to Future:</strong> Return songs to planning
                      stage
                    </li>
                    <li>
                      <strong>Mark Optional:</strong> Toggle optional status
                    </li>
                  </ul>
                </div>

                <div
                  style={{
                    background: "#fff3cd",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    border: "1px solid #ffeaa7",
                  }}
                >
                  <h4 style={{ color: "#333", marginTop: 0 }}>
                    🎧 Spotify Operations
                  </h4>
                  <ul style={listStyle}>
                    <li>
                      <strong>Bulk Enhancement:</strong> Enhance multiple songs
                      with Spotify data
                    </li>
                    <li>
                      <strong>Clean Remaster Tags:</strong> Remove remaster
                      suffixes from song titles
                    </li>
                  </ul>
                </div>

                <div
                  style={{
                    background: "#ffe6e6",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    border: "1px solid #ffb3b3",
                  }}
                >
                  <h4 style={{ color: "#333", marginTop: 0 }}>🗑️ Management</h4>
                  <ul style={listStyle}>
                    <li>
                      <strong>Bulk Delete:</strong> Remove multiple songs at
                      once
                    </li>
                    <li>
                      <strong>Confirmation:</strong> Always confirms before
                      deleting
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        );

      case "album-series":
        return (
          <div>
            <h2 style={headingStyle}>📀 Album Series</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>What Is The Album Series?</h3>
              <p style={textStyle}>
                The Album Series is a <strong>collaborative community project</strong> where members contribute album-centric 
                packs. Only album series releases get official series numbers and appear on the public Album Series page for 
                everyone to see.
              </p>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>How It Works</h4>
                <ul style={listStyle}>
                  <li><strong>Community Project:</strong> One shared Album Series that all users contribute to</li>
                  <li><strong>Album-Centric Packs:</strong> Each entry focuses on songs from a specific album</li>
                  <li><strong>Private Development:</strong> Album series remain private while you work on them</li>
                  <li><strong>Public Release:</strong> When you release an album series, it gets a series number and becomes visible to everyone</li>
                  <li><strong>Any Album Qualifies:</strong> No themes or restrictions - any album can be added</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Creating Album Series</h3>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Qualification Requirements
              </h4>
              <p style={textStyle}>
                When your pack has{" "}
                <strong>4 or more songs from the same album</strong>, TrackFlow
                recognizes it as eligible for the Album Series and allows you to
                add it to the community project.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>
                Two Ways to Create Album Series Entries
              </h4>

              <div
                style={{
                  background: "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                  marginTop: "1rem",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  Method 1: During Pack Creation
                </h4>
                <ol style={listStyle}>
                  <li>
                    When creating a new pack, check{" "}
                    <strong>"Create as Album Series"</strong>
                  </li>
                  <li>
                    This automatically marks your pack as an Album Series entry
                  </li>
                  <li>You get immediate access to the Album Series Editor</li>
                  <li>
                    Use the editor to easily add songs from the complete album
                    tracklist
                  </li>
                </ol>
              </div>

              <div
                style={{
                  background: "#f0f9f0",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #c3e6c3",
                  marginTop: "1rem",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  Method 2: Convert Existing Pack
                </h4>
                <ol style={listStyle}>
                  <li>
                    Create a regular pack with 4+ songs from the same album
                  </li>
                  <li>TrackFlow will recognize the album pattern</li>
                  <li>
                    In the pack dropdown menu, look for{" "}
                    <strong>"Make Album Series"</strong>
                  </li>
                  <li>
                    Click the option to convert your pack to an Album Series
                    entry
                  </li>
                  <li>Your pack becomes part of the community Album Series</li>
                </ol>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Album Series Editor</h3>
              <div
                style={{
                  background: "#e7f3ff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <h4 style={{ color: "#333", marginTop: 0 }}>
                  Smart Album Management
                </h4>
                <p style={textStyle}>
                  The Album Series Editor fetches the complete album tracklist and provides intelligent track management 
                  with visual indicators for each song:
                </p>
                
                <h4 style={{ color: "#333" }}>Track Status Indicators</h4>
                <ul style={listStyle}>
                  <li><strong>✅ In Pack:</strong> Song is already in your pack</li>
                  <li><strong>🎵 Official DLC:</strong> Automatically detected as existing Rock Band DLC</li>
                  <li><strong>⚠️ Preexisting:</strong> Marked as already done by community</li>
                  <li><strong>❌ Missing:</strong> Not in pack yet, can be added with one click</li>
                  <li><strong>🚫 Irrelevant:</strong> Marked as not relevant (interludes, skits, demos, bonus tracks etc.)</li>
                </ul>

                <h4 style={{ color: "#333" }}>Key Features</h4>
                <ul style={listStyle}>
                  <li><strong>One-Click Addition:</strong> Add missing tracks instantly</li>
                  <li><strong>Automatic DLC Detection:</strong> Prevents duplicate work on official songs</li>
                  <li><strong>Mark as Irrelevant:</strong> Flag tracks that shouldn't be customs (interludes, spoken word)</li>
                  <li><strong>Mark as Preexisting:</strong> Note tracks already done as customs by others</li>
                  <li><strong>Coverage Tracking:</strong> Shows completion percentage</li>
                  <li><strong>Link Existing Songs:</strong> Connect differently-named songs in your pack</li>
                </ul>

                <h4 style={{ color: "#333" }}>Benefits</h4>
                <ul style={listStyle}>
                  <li>
                    No need to manually type every song title from an album
                  </li>
                  <li>Ensures you don't miss any tracks from the album</li>
                  <li>
                    Maintains consistent naming and metadata across the album
                  </li>
                  <li>
                    Streamlines the process of creating complete album packs
                  </li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Community Impact</h3>
              <div
                style={{
                  background: "#f0f9f0",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #c3e6c3",
                }}
              >
                <ul style={listStyle}>
                  <li>
                    <strong>Shared Goal:</strong> Everyone works toward growing
                    the same Album Series count
                  </li>
                  <li>
                    <strong>Diverse Contributions:</strong> Any album from any
                    artist, genre, or era can be added
                  </li>
                  <li>
                    <strong>Progress Tracking:</strong> See the community's
                    total progress across all albums
                  </li>
                  <li>
                    <strong>Collaboration:</strong> Multiple people can work on
                    different albums simultaneously
                  </li>
                  <li>
                    <strong>Recognition:</strong> Your album contributions are
                    part of the larger community achievement
                  </li>
                </ul>
              </div>
            </section>
          </div>
        );

      case "faq":
        return (
          <div>
            <h2 style={headingStyle}>❓ Frequently Asked Questions</h2>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Getting Started Questions</h3>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I create my first song?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  Click "New +" → "New Song" in the navigation. Enter the song
                  title and artist, choose a pack (or create a new one), and the
                  song will be automatically enhanced with Spotify metadata.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  What's the difference between a song and a pack?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  A <strong>song</strong> is an individual track you're working
                  on. A <strong>pack</strong> is a collection of related songs,
                  usually representing an album or themed collection. Packs help
                  organize your work and track progress across multiple songs.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I set up my workflow?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  Go to Settings → Workflow to customize your authoring steps.
                  Add steps like "Tempo Map", "Drums", "Bass", etc. You can
                  reorder them by dragging, rename them, or add custom steps
                  that match your process.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Workflow & Progress Questions</h3>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I mark workflow steps as complete?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  On the WIP page, click the checkboxes next to each workflow
                  step as you complete them. The progress bar will update
                  automatically, and you'll get a celebration when the song is
                  100% complete! 🎉
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  What are the different song statuses?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  <strong>Future Plans:</strong> Songs you're planning to work
                  on but haven't started.
                  <br />
                  <strong>In Progress (WIP):</strong> Songs you're actively
                  working on with workflow tracking.
                  <br />
                  <strong>Released:</strong> Completed songs that are finished
                  and published.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I move songs between statuses?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  Use "Start Work" to move songs from Future Plans to WIP. When
                  a pack is complete, use "Release Pack" to move finished songs
                  to Released. You can also edit individual song status in the
                  song details.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Spotify & Enhancement Questions</h3>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How does Spotify integration work?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  When you create songs, TrackFlow automatically searches
                  Spotify for matches and imports album art, release year, and
                  album information. If multiple matches are found, you can
                  choose the best one.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  Can I import entire Spotify playlists?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  Absolutely! Use "Import from Spotify" in the main menu. Paste
                  any public Spotify playlist URL, and all songs will be
                  imported with full metadata and organized into a pack.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Collaboration Questions</h3>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do collaborations work with different workflows?
                </h4>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginLeft: "1rem",
                  }}
                >
                  There's only one workflow per song, which is determined by the
                  song owner/creator. All collaborators on that song see and use
                  the same workflow steps as defined by the song owner.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                }}
              >
                <h3 style={{ color: "#333", marginTop: 0 }}>
                  📧 Still Need Help?
                </h3>
                <p style={{ lineHeight: "1.6", color: "#555" }}>
                  If you have questions not covered here or need feature
                  requests, feel free to contact the admin Yaniv:
                </p>
                <ul style={listStyle}>
                  <li>
                    <strong>Discord:</strong> yaniv297
                  </li>
                  <li>
                    <strong>Email:</strong> yanivb297@gmail.com
                  </li>
                </ul>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#555",
                    marginTop: "1rem",
                  }}
                >
                  You can also look for updates to this guide as new features
                  are added.
                </p>
              </div>
            </section>
          </div>
        );

      default:
        return (
          <div>Select a section from the navigation to view the guide.</div>
        );
    }
  }
}

export default HelpPage;
