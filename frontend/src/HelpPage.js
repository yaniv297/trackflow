import React from "react";
import { useNavigate } from "react-router-dom";

function HelpPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Help & FAQ</h1>
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

      <div
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          padding: "2rem",
        }}
      >
        {/* Overview */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            What is TrackFlow?
          </h2>
          <p style={{ lineHeight: "1.6", color: "#333" }}>
            TrackFlow is a project management system designed for Rock Band
            custom song authoring. It helps you track your authoring progress,
            collaborate with other authors, and manage multiple songs and packs
            efficiently.
          </p>
        </section>

        {/* Custom Workflows */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            📋 Custom Workflows
          </h2>
          <p style={{ lineHeight: "1.6", color: "#333" }}>
            <strong>Every user has their own custom workflow</strong> - the
            steps they need to complete for each song.
          </p>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              <strong>Customize Your Steps:</strong> Go to Settings → Workflow
              to add, remove, or reorder your authoring steps
            </li>
            <li>
              <strong>Track Progress:</strong> Click checkboxes on the WIP page
              to mark steps as complete
            </li>
            <li>
              <strong>Visual Feedback:</strong> Progress bars show completion
              percentage for each song
            </li>
            <li>
              <strong>Examples:</strong> Common steps include Tempo Map, Drums,
              Bass, Guitar, Vocals, Harmonies, Pro Keys, Venue, Animations,
              Compile
            </li>
          </ul>
        </section>

        {/* Packs & Songs */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            📦 Packs & Songs
          </h2>

          <h3 style={{ color: "#333", marginTop: "1rem" }}>Packs</h3>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            Packs are collections of songs (e.g., an album, artist discography,
            or themed compilation).
          </p>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              <strong>Create Pack:</strong> Click "New +" → "New Pack" in the
              navigation
            </li>
            <li>
              <strong>Pack Info:</strong> Set artist, album name, cover art, and
              release year
            </li>
            <li>
              <strong>Album Series:</strong> Group related albums together
              (e.g., "Beatles Albums")
            </li>
          </ul>

          <h3 style={{ color: "#333", marginTop: "1.5rem" }}>Songs</h3>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            Individual tracks in your authoring pipeline.
          </p>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              <strong>Create Song:</strong> Click "New +" → "New Song" or add to
              an existing pack
            </li>
            <li>
              <strong>Song Status:</strong> Not Started, In Progress, Complete,
              or Released
            </li>
            <li>
              <strong>Spotify Integration:</strong> Import song metadata and
              artwork from Spotify
            </li>
            <li>
              <strong>File Links:</strong> Attach Google Drive, Dropbox, or
              other links to song files
            </li>
          </ul>
        </section>

        {/* Collaborations */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            🤝 Collaborations
          </h2>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            Work with other authors on packs or songs. Each collaborator has
            their own workflow and progress tracking.
          </p>

          <h3 style={{ color: "#333", marginTop: "1rem" }}>How It Works</h3>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              <strong>Add Collaborator:</strong> Click "Add Collaborator" on a
              pack or song
            </li>
            <li>
              <strong>Select User:</strong> Choose an existing user or create a
              new "unclaimed" account
            </li>
            <li>
              <strong>Separate Progress:</strong> Each person tracks their own
              workflow steps independently
            </li>
            <li>
              <strong>Visibility:</strong> You can see all collaborators'
              progress on the WIP page
            </li>
          </ul>

          <h3 style={{ color: "#333", marginTop: "1.5rem" }}>
            Unclaimed Users
          </h3>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            When you add a collaborator who doesn't have an account yet,
            TrackFlow creates an "unclaimed" user. Later, they can claim their
            account at registration and see all their assigned work.
          </p>
        </section>

        {/* WIP Page */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            🎯 WIP (Work In Progress) Page
          </h2>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            Your main workspace showing all songs you're currently working on.
          </p>

          <h3 style={{ color: "#333", marginTop: "1rem" }}>Features</h3>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              <strong>Pack View:</strong> Songs grouped by pack/album
            </li>
            <li>
              <strong>Progress Tracking:</strong> Click workflow step checkboxes
              to update progress
            </li>
            <li>
              <strong>Filtering:</strong> Show only your core songs or include
              collaborations
            </li>
            <li>
              <strong>Completion Celebration:</strong> 🎉 Fireworks when you
              complete a song!
            </li>
            <li>
              <strong>Quick Actions:</strong> Edit, delete, or view song details
            </li>
          </ul>
        </section>

        {/* Stats & Album Series */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            📊 Stats & Organization
          </h2>

          <h3 style={{ color: "#333", marginTop: "1rem" }}>Stats Page</h3>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            View analytics about your authoring progress, including total songs,
            completion rates, and workflow step statistics.
          </p>

          <h3 style={{ color: "#333", marginTop: "1.5rem" }}>Album Series</h3>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            Group related albums together (e.g., all Beatles albums, all
            Metallica albums). Navigate to the Album Series page to create and
            manage series.
          </p>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            ❓ Frequently Asked Questions
          </h2>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              How do I change my workflow steps?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              Go to Settings → Workflow. You can add new steps, remove existing
              ones, reorder them, and rename them. Changes apply immediately to
              all your in-progress songs.
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              What happens when I add a new workflow step?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              The new step is automatically added to all your in-progress songs.
              Already-completed songs will have the new step marked as complete
              automatically.
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              Can I import song data from Spotify?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              Yes! When editing a song, click "Enhance with Spotify" to search
              for the track and automatically import metadata, album art, and
              release year.
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              How do collaborations work with different workflows?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              Each user has their own custom workflow. When you collaborate on a
              song, you see your workflow steps, and your collaborator sees
              theirs. Progress is tracked independently.
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              What's the difference between a Pack and an Album Series?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              A <strong>Pack</strong> is a single collection of songs (usually
              one album). An <strong>Album Series</strong> groups multiple packs
              together (e.g., all albums by an artist).
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              How do I mark a song as complete?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              Check off all your workflow steps on the WIP page. When all steps
              are complete, the song shows 100% completion and you'll see a
              celebration! 🎉
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>
              Can I attach files to songs?
            </h4>
            <p style={{ lineHeight: "1.6", color: "#555", marginLeft: "1rem" }}>
              Yes! Use File Links to attach Google Drive, Dropbox, or other
              URLs. Click the link icon when viewing or editing a song.
            </p>
          </div>
        </section>

        {/* Tips & Tricks */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            💡 Tips & Tricks
          </h2>
          <ul style={{ lineHeight: "1.8", color: "#555" }}>
            <li>
              Use meaningful workflow step names that match your actual process
            </li>
            <li>Create packs for albums to keep songs organized</li>
            <li>
              Add collaborators early so they can track their progress from the
              start
            </li>
            <li>
              Use Album Series to group artist discographies or themed
              collections
            </li>
            <li>Import from Spotify to save time on data entry</li>
            <li>
              Update your workflow as your process evolves - it's flexible!
            </li>
            <li>Check the Stats page regularly to see your overall progress</li>
          </ul>
        </section>

        {/* Contact */}
        <section>
          <h2
            style={{
              color: "#007bff",
              borderBottom: "2px solid #007bff",
              paddingBottom: "0.5rem",
            }}
          >
            📧 Need More Help?
          </h2>
          <p style={{ lineHeight: "1.6", color: "#555" }}>
            If you have questions or feature requests, check your Settings →
            Profile for contact information or reach out to your system
            administrator.
          </p>
        </section>
      </div>
    </div>
  );
}

export default HelpPage;
