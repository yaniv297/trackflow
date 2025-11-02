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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>TrackFlow User Guide</h1>
        <button
          onClick={() => navigate("/wip")}
          style={{
            padding: "0.5rem 1rem",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back to WIP
        </button>
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
    const subHeadingStyle = { color: "#333", marginTop: "1.5rem", marginBottom: "0.5rem" };
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
                TrackFlow is a comprehensive project management system designed for Rock Band custom song authoring. 
                It helps you track your authoring progress, collaborate with other authors, and manage multiple songs 
                and packs efficiently from initial planning through final release.
              </p>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Understanding Song Statuses</h3>
              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                <p style={textStyle}>
                  TrackFlow organizes your songs into three statuses that represent different stages of your authoring process:
                </p>
                
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#6c757d", marginTop: 0 }}>🗓️ Future Plans</h4>
                  <p style={textStyle}>
                    Songs you're planning to work on but haven't started yet. This is your backlog of ideas and planned projects.
                    New songs start here automatically.
                  </p>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#007bff", marginTop: 0 }}>⚡ In Progress (WIP)</h4>
                  <p style={textStyle}>
                    Songs you're actively working on. These appear on your WIP page with progress tracking and workflow steps.
                    This is where you'll spend most of your time authoring.
                  </p>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "#28a745", marginTop: 0 }}>✅ Released</h4>
                  <p style={textStyle}>
                    Completed songs that are finished and published. These represent your completed work and achievements.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Your First Steps</h3>
              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>1. Create Your First Song</h4>
                <p style={textStyle}>
                  • Click the <strong>"New +"</strong> button in the navigation<br/>
                  • Select <strong>"New Song"</strong> to create a single track<br/>
                  • Enter the song title and artist<br/>
                  • Choose or create a pack to organize it<br/>
                  • The song will automatically be enhanced with Spotify metadata<br/>
                  • Your new song will appear in <strong>Future Plans</strong>
                </p>

                <h4 style={{ color: "#333" }}>2. Create Your First Pack</h4>
                <p style={textStyle}>
                  • Click <strong>"New +"</strong> → <strong>"New Pack"</strong> for multiple songs<br/>
                  • Choose <strong>"Single Artist"</strong> mode for one artist, multiple songs<br/>
                  • Or <strong>"Mixed Artists"</strong> mode using "Artist - Title" format<br/>
                  • All songs will be grouped together for easy management<br/>
                  • All new songs start in <strong>Future Plans</strong> status
                </p>

                <h4 style={{ color: "#333" }}>3. Start Working on Songs</h4>
                <p style={textStyle}>
                  • Go to the <strong>Future Plans</strong> page to see your planned songs<br/>
                  • Select songs you want to work on<br/>
                  • Click the <strong>"Start Work"</strong> button to move them to WIP<br/>
                  • Your songs will now appear on the <strong>WIP page</strong> with progress tracking
                </p>

                <h4 style={{ color: "#333" }}>4. Track Your Progress</h4>
                <p style={textStyle}>
                  • Navigate to the <strong>WIP (Work In Progress)</strong> page<br/>
                  • Check off workflow steps as you complete them<br/>
                  • Watch your progress bars fill up<br/>
                  • Celebrate when you complete songs! 🎉
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Quick Tour: Main Navigation</h3>
              <ul style={listStyle}>
                <li><strong>WIP:</strong> Your main workspace - songs you're actively working on</li>
                <li><strong>Future Plans:</strong> Songs in planning stage, not yet started</li>
                <li><strong>Released:</strong> Completed songs you've finished</li>
                <li><strong>Album Series:</strong> Manage complete album collections</li>
                <li><strong>Stats:</strong> View your progress analytics and completion rates</li>
                <li><strong>Settings:</strong> Customize your workflow and profile</li>
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
                Songs are individual tracks in your authoring pipeline. Each song has a title, artist, and belongs to a pack.
              </p>
              
              <h4 style={{ color: "#333", marginTop: "1rem" }}>Creating Songs</h4>
              <ul style={listStyle}>
                <li><strong>Single Song:</strong> Use "New +" → "New Song" for individual tracks</li>
                <li><strong>Bulk Creation:</strong> Use "New +" → "New Pack" to create multiple songs at once</li>
                <li><strong>Spotify Import:</strong> Use "Import from Spotify" to import entire playlists</li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Song Properties</h4>
              <ul style={listStyle}>
                <li><strong>Basic Info:</strong> Title, Artist, Album, Year</li>
                <li><strong>Pack Assignment:</strong> Which collection the song belongs to</li>
                <li><strong>Status:</strong> Future Plans, In Progress, or Released</li>
                <li><strong>Optional/Required:</strong> Mark songs as optional for pack completion</li>
                <li><strong>Cover Art:</strong> Automatically fetched from Spotify</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Understanding Packs</h3>
              <p style={textStyle}>
                Packs are collections of related songs, typically representing albums, artist discographies, or themed compilations.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Pack Features</h4>
              <ul style={listStyle}>
                <li><strong>Organization:</strong> Group songs by album, artist, or theme</li>
                <li><strong>Progress Tracking:</strong> See completion percentage across all songs</li>
                <li><strong>Bulk Operations:</strong> Release entire packs when complete</li>
                <li><strong>Collaboration:</strong> Share entire packs with other authors</li>
                <li><strong>Album Series:</strong> Convert packs to album series for advanced organization</li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Pack Management</h4>
              <ul style={listStyle}>
                <li><strong>Create:</strong> When adding songs, specify pack name (creates if doesn't exist)</li>
                <li><strong>Rename:</strong> Click pack name to edit</li>
                <li><strong>Release:</strong> Move completed songs to Released status</li>
                <li><strong>Move to Future:</strong> Send entire packs back to planning stage</li>
                <li><strong>Delete:</strong> Remove packs and all contained songs</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Song Editing & Management</h3>
              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>Quick Edit</h4>
                <p style={textStyle}>
                  Click any song field to edit in-place. Changes save automatically.
                </p>

                <h4 style={{ color: "#333" }}>Spotify Enhancement</h4>
                <p style={textStyle}>
                  Click "Enhance" to search Spotify for better metadata, album art, and release year.
                  Choose from multiple matches if available.
                </p>

                <h4 style={{ color: "#333" }}>Optional Songs</h4>
                <p style={textStyle}>
                  Mark songs as "optional" - these don't count toward pack completion but can still be worked on.
                  Useful for bonus tracks or alternate versions.
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
              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ color: "#6c757d", marginTop: 0 }}>🗓️ Future Plans</h4>
                  <p style={textStyle}>
                    Songs you're planning to work on but haven't started yet. This is your backlog of ideas and planned projects.
                  </p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ color: "#007bff", marginTop: 0 }}>⚡ In Progress (WIP)</h4>
                  <p style={textStyle}>
                    Songs you're actively working on. These appear on your WIP page with workflow tracking, progress bars, and completion percentages.
                  </p>
                </div>

                <div>
                  <h4 style={{ color: "#28a745", marginTop: 0 }}>✅ Released</h4>
                  <p style={textStyle}>
                    Completed songs that are finished and published. These represent your completed work and achievements.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Moving Between Statuses</h3>
              <ul style={listStyle}>
                <li><strong>Future → WIP:</strong> Use "Start Work" button or move individual songs</li>
                <li><strong>WIP → Released:</strong> Complete all workflow steps, then release the pack</li>
                <li><strong>Released → Future:</strong> Use "Move to Future Plans" to reopen completed work</li>
                <li><strong>Individual Songs:</strong> Edit song status directly in song details</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Custom Workflows</h3>
              <p style={textStyle}>
                <strong>Every user has their own custom workflow</strong> - the specific steps they need to complete for each song.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Setting Up Your Workflow</h4>
              <ul style={listStyle}>
                <li><strong>Access:</strong> Go to Settings → Workflow</li>
                <li><strong>Add Steps:</strong> Click "Add Step" and name your custom steps</li>
                <li><strong>Reorder:</strong> Drag and drop to arrange steps in your preferred order</li>
                <li><strong>Rename:</strong> Click any step name to edit it</li>
                <li><strong>Remove:</strong> Delete steps you don't need</li>
                <li><strong>Reset:</strong> Return to default workflow anytime</li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Common Workflow Steps</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
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
              <div style={{ background: "#e7f3ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>The WIP Page - Your Main Workspace</h4>
                <ul style={listStyle}>
                  <li><strong>Progress Tracking:</strong> Click workflow checkboxes to mark steps complete</li>
                  <li><strong>Visual Progress:</strong> Progress bars show completion percentage</li>
                  <li><strong>Pack View:</strong> Songs grouped by pack with pack-level progress</li>
                  <li><strong>Completion View:</strong> Songs grouped by how complete they are</li>
                  <li><strong>Celebrations:</strong> 🎉 Fireworks when you complete songs!</li>
                  <li><strong>Quick Actions:</strong> Edit, delete, enhance, or collaborate on songs</li>
                </ul>

                <h4 style={{ color: "#333" }}>Workflow Tips</h4>
                <ul style={listStyle}>
                  <li>Check off steps as you complete them - don't wait until the end</li>
                  <li>Use the progress bars to prioritize which songs to focus on</li>
                  <li>Customize your workflow to match your actual process</li>
                  <li>Add new steps when you discover new parts of your process</li>
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
                TrackFlow supports both pack-level and song-level collaboration. Each collaborator has their own workflow 
                and tracks their progress independently, while you can see everyone's status.
              </p>

              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", marginTop: "1rem" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>Pack Collaboration</h4>
                <ul style={listStyle}>
                  <li><strong>View Access:</strong> Collaborators can see all songs in the pack</li>
                  <li><strong>Edit Access:</strong> Collaborators can modify any song in the pack</li>
                  <li><strong>Independent Workflows:</strong> Each person uses their own workflow steps</li>
                  <li><strong>Shared Progress:</strong> Everyone can see each other's completion status</li>
                </ul>

                <h4 style={{ color: "#333" }}>Song Collaboration</h4>
                <ul style={listStyle}>
                  <li><strong>Specific Songs:</strong> Share individual songs without sharing the entire pack</li>
                  <li><strong>Edit Access:</strong> Collaborators can modify only the specific songs shared</li>
                  <li><strong>Targeted Work:</strong> Perfect for specialists working on specific tracks</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Adding Collaborators</h3>
              <div style={{ background: "#e7f3ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>Step-by-Step Process</h4>
                <ol style={listStyle}>
                  <li>Navigate to the song or pack you want to share</li>
                  <li>Click the <strong>"Add Collaborator"</strong> button</li>
                  <li>Choose an existing user from the dropdown, or</li>
                  <li>Create a new "unclaimed" user account</li>
                  <li>Select the permission level (View or Edit)</li>
                  <li>The collaborator will immediately see the shared content</li>
                </ol>

                <h4 style={{ color: "#333" }}>Permission Levels</h4>
                <ul style={listStyle}>
                  <li><strong>View:</strong> Can see songs and progress but cannot edit</li>
                  <li><strong>Edit:</strong> Can modify songs, update workflow steps, and change details</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Unclaimed Users</h3>
              <p style={textStyle}>
                When you add a collaborator who doesn't have a TrackFlow account yet, the system creates an "unclaimed" user account.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>How It Works</h4>
              <ul style={listStyle}>
                <li><strong>Immediate Access:</strong> Unclaimed users appear in your collaborator lists right away</li>
                <li><strong>Progress Tracking:</strong> You can assign work and track progress even before they register</li>
                <li><strong>Account Claiming:</strong> When they register with the same username, they automatically claim their account</li>
                <li><strong>Seamless Transition:</strong> All assigned work and progress carries over when claimed</li>
              </ul>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Benefits</h4>
              <ul style={listStyle}>
                <li>Start collaborating immediately without waiting for registration</li>
                <li>Plan and assign work ahead of time</li>
                <li>Track team progress from day one</li>
                <li>No disruption when collaborators join later</li>
              </ul>
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
                TrackFlow automatically enhances new songs with Spotify metadata, making data entry faster and more accurate.
              </p>

              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>What Gets Enhanced</h4>
                <ul style={listStyle}>
                  <li><strong>Album Information:</strong> Official album name and release year</li>
                  <li><strong>Cover Art:</strong> High-quality album artwork automatically downloaded</li>
                  <li><strong>Metadata:</strong> Correct artist names, featuring artists, and track details</li>
                  <li><strong>Title Cleaning:</strong> Removes remaster tags and extra text for cleaner titles</li>
                </ul>

                <h4 style={{ color: "#333" }}>When It Happens</h4>
                <ul style={listStyle}>
                  <li><strong>New Songs:</strong> Automatically when you create individual songs</li>
                  <li><strong>Pack Creation:</strong> All songs in new packs are enhanced automatically</li>
                  <li><strong>Spotify Import:</strong> Songs imported from playlists come pre-enhanced</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Manual Enhancement</h3>
              <p style={textStyle}>
                Sometimes you need to find better Spotify matches or enhance songs that weren't automatically processed.
              </p>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>How to Enhance Manually</h4>
              <ol style={listStyle}>
                <li>Click the <strong>"Enhance"</strong> button on any song</li>
                <li>TrackFlow searches Spotify for matches based on title and artist</li>
                <li>If multiple matches are found, you'll see a selection dialog</li>
                <li>Choose the best match from the list</li>
                <li>The song is updated with the selected Spotify data</li>
              </ol>

              <h4 style={{ color: "#333", marginTop: "1rem" }}>Spotify Playlist Import</h4>
              <div style={{ background: "#e7f3ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>Import Process</h4>
                <ol style={listStyle}>
                  <li>Navigate to <strong>"Import from Spotify"</strong> in the main menu</li>
                  <li>Paste a Spotify playlist URL</li>
                  <li>Choose whether to create a new pack or add to existing pack</li>
                  <li>All songs are imported with full Spotify metadata</li>
                  <li>Songs are automatically enhanced with cover art and album information</li>
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
                Select multiple songs across different packs to perform batch operations efficiently. 
                Bulk operations are available on the <strong>Future Plans and Released pages</strong>.
              </p>

              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>How to Select Songs</h4>
                <ul style={listStyle}>
                  <li><strong>Individual Selection:</strong> Click checkboxes next to song titles</li>
                  <li><strong>Select All:</strong> Use the header checkbox to select all visible songs</li>
                  <li><strong>Cross-Pack Selection:</strong> Select songs from different packs for batch operations</li>
                  <li><strong>Pack-Level Selection:</strong> Select entire packs at once</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Available Operations</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div style={{ background: "#e7f3ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
                  <h4 style={{ color: "#333", marginTop: 0 }}>📝 Bulk Editing</h4>
                  <ul style={listStyle}>
                    <li><strong>Artist:</strong> Change artist for multiple songs</li>
                    <li><strong>Album:</strong> Update album name across songs</li>
                    <li><strong>Year:</strong> Set release year for multiple tracks</li>
                    <li><strong>Pack:</strong> Move songs to different packs</li>
                    <li><strong>Album Art:</strong> Update cover art using an artwork link</li>
                  </ul>
                </div>

                <div style={{ background: "#f0f9f0", padding: "1.5rem", borderRadius: "8px", border: "1px solid #c3e6c3" }}>
                  <h4 style={{ color: "#333", marginTop: 0 }}>🔄 Status Operations</h4>
                  <ul style={listStyle}>
                    <li><strong>Start Work:</strong> Move songs from Future Plans to WIP</li>
                    <li><strong>Release Songs:</strong> Mark completed songs as Released</li>
                    <li><strong>Back to Future:</strong> Return songs to planning stage</li>
                    <li><strong>Mark Optional:</strong> Toggle optional status</li>
                  </ul>
                </div>

                <div style={{ background: "#fff3cd", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ffeaa7" }}>
                  <h4 style={{ color: "#333", marginTop: 0 }}>🎧 Spotify Operations</h4>
                  <ul style={listStyle}>
                    <li><strong>Bulk Enhancement:</strong> Enhance multiple songs with Spotify data</li>
                    <li><strong>Clean Remaster Tags:</strong> Remove remaster suffixes from song titles</li>
                  </ul>
                </div>

                <div style={{ background: "#ffe6e6", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ffb3b3" }}>
                  <h4 style={{ color: "#333", marginTop: 0 }}>🗑️ Management</h4>
                  <ul style={listStyle}>
                    <li><strong>Bulk Delete:</strong> Remove multiple songs at once</li>
                    <li><strong>Confirmation:</strong> Always confirms before deleting</li>
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
              <h3 style={subHeadingStyle}>What Are Album Series?</h3>
              <p style={textStyle}>
                Album Series are collections of packs, where each pack in the series focuses on a specific album. 
                This allows you to organize related albums together (like an artist's discography) while keeping 
                each album as its own separate pack.
              </p>

              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>How It Works</h4>
                <ul style={listStyle}>
                  <li><strong>Series Structure:</strong> A series contains multiple packs, each representing one album</li>
                  <li><strong>Pack Focus:</strong> Each pack in the series focuses on songs from a specific album</li>
                  <li><strong>Qualification:</strong> Packs with 4+ songs from the same album qualify for album series</li>
                  <li><strong>Organization:</strong> Perfect for artist discographies or themed album collections</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Creating Album Series</h3>
              
              <h4 style={{ color: "#333", marginTop: "1rem" }}>Qualification Requirements</h4>
              <p style={textStyle}>
                When your pack has <strong>4 or more songs from the same album</strong>, TrackFlow recognizes it as eligible 
                for an album series and allows you to convert it.
              </p>
              
              <h4 style={{ color: "#333", marginTop: "1rem" }}>Conversion Process</h4>
              <ol style={listStyle}>
                <li>Create a pack with 4+ songs from the same album</li>
                <li>TrackFlow will recognize the album pattern</li>
                <li>Click <strong>"Convert to Album Series"</strong> when the option appears</li>
                <li>Choose whether to create a new series or add to an existing series</li>
                <li>Your pack becomes part of the album series structure</li>
              </ol>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Album Series Editor</h3>
              <div style={{ background: "#e7f3ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
                <h4 style={{ color: "#333", marginTop: 0 }}>Enhanced Album Management</h4>
                <p style={textStyle}>
                  Once you've created an album series, you get access to the Album Series Editor with powerful features:
                </p>
                <ul style={listStyle}>
                  <li><strong>Full Tracklist Fetching:</strong> Automatically fetches the complete album tracklist</li>
                  <li><strong>Easy Song Addition:</strong> Quickly add songs from the album to your pack</li>
                  <li><strong>Complete Album View:</strong> See all tracks from the album, not just what you've added</li>
                  <li><strong>Gap Identification:</strong> Easily spot which album tracks you haven't added yet</li>
                </ul>

                <h4 style={{ color: "#333" }}>Benefits</h4>
                <ul style={listStyle}>
                  <li>No need to manually type every song title from an album</li>
                  <li>Ensures you don't miss any tracks from the album</li>
                  <li>Maintains consistent naming and metadata across the album</li>
                  <li>Streamlines the process of creating complete album packs</li>
                </ul>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Example Use Cases</h3>
              <ul style={listStyle}>
                <li><strong>Artist Discographies:</strong> "The Beatles Albums" series with separate packs for Abbey Road, Sgt. Pepper's, etc.</li>
                <li><strong>Concept Albums:</strong> "Pink Floyd Concept Albums" with The Wall, Dark Side of the Moon, etc.</li>
                <li><strong>Greatest Hits Collections:</strong> "80s Greatest Hits" with different compilation albums</li>
                <li><strong>Soundtrack Series:</strong> "Marvel Movie Soundtracks" with each movie's soundtrack as a pack</li>
              </ul>
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
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  Click "New +" → "New Song" in the navigation. Enter the song title and artist, choose a pack (or create a new one), 
                  and the song will be automatically enhanced with Spotify metadata.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  What's the difference between a song and a pack?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  A <strong>song</strong> is an individual track you're working on. A <strong>pack</strong> is a collection of related songs, 
                  usually representing an album or themed collection. Packs help organize your work and track progress across multiple songs.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I set up my workflow?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  Go to Settings → Workflow to customize your authoring steps. Add steps like "Tempo Map", "Drums", "Bass", etc. 
                  You can reorder them by dragging, rename them, or add custom steps that match your process.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Workflow & Progress Questions</h3>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I mark workflow steps as complete?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  On the WIP page, click the checkboxes next to each workflow step as you complete them. 
                  The progress bar will update automatically, and you'll get a celebration when the song is 100% complete! 🎉
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  What are the different song statuses?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  <strong>Future Plans:</strong> Songs you're planning to work on but haven't started.<br/>
                  <strong>In Progress (WIP):</strong> Songs you're actively working on with workflow tracking.<br/>
                  <strong>Released:</strong> Completed songs that are finished and published.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do I move songs between statuses?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  Use "Start Work" to move songs from Future Plans to WIP. When a pack is complete, use "Release Pack" to move 
                  finished songs to Released. You can also edit individual song status in the song details.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Spotify & Enhancement Questions</h3>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How does Spotify integration work?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  When you create songs, TrackFlow automatically searches Spotify for matches and imports album art, 
                  release year, and album information. If multiple matches are found, you can choose the best one.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  Can I import entire Spotify playlists?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  Absolutely! Use "Import from Spotify" in the main menu. Paste any public Spotify playlist URL, 
                  and all songs will be imported with full metadata and organized into a pack.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={subHeadingStyle}>Collaboration Questions</h3>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  How do collaborations work with different workflows?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  Each user has their own custom workflow. When you collaborate on a song, you see your workflow steps, 
                  and your collaborator sees theirs. Progress is tracked independently for each person.
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
                  What are "unclaimed" users?
                </h4>
                <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
                  When you add a collaborator who doesn't have an account yet, TrackFlow creates an "unclaimed" user. 
                  Later, they can register with the same username and automatically claim their account with all assigned work intact.
                </p>
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                <h3 style={{ color: "#333", marginTop: 0 }}>📧 Still Need Help?</h3>
                <p style={{ lineHeight: "1.6", color: "#555" }}>
                  If you have questions not covered here or need feature requests:
                </p>
                <ul style={listStyle}>
                  <li>Check your Settings → Profile for contact information</li>
                  <li>Reach out to your system administrator</li>
                  <li>Look for updates to this guide as new features are added</li>
                </ul>
              </div>
            </section>
          </div>
        );

      default:
        return <div>Select a section from the navigation to view the guide.</div>;
    }
  }
}

export default HelpPage;
