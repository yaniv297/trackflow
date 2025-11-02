import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../utils/api";

const RegistrationWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Step 1: User selection
  const [unclaimedUsers, setUnclaimedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Step 2: Account details
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 3: Workflow customization
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [defaultSteps, setDefaultSteps] = useState([]);

  // Load unclaimed users on mount
  useEffect(() => {
    loadUnclaimedUsers();
    loadDefaultWorkflow();
  }, []);

  const loadUnclaimedUsers = async () => {
    try {
      const users = await apiGet("/auth/unclaimed-users");
      setUnclaimedUsers(users || []);
    } catch (error) {
      console.error("Failed to load unclaimed users:", error);
    }
  };

  const loadDefaultWorkflow = async () => {
    try {
      // Get default template steps from a public endpoint or hardcode
      // Since /workflows/my-workflow requires auth, we'll use hardcoded default
      const error = new Error("Using fallback");
      throw error;
    } catch (error) {
      // Fallback to hardcoded default
      const fallbackSteps = [
        { step_name: "tempo_map", display_name: "Tempo Map", order_index: 0 },
        { step_name: "drums", display_name: "Drums", order_index: 1 },
        { step_name: "bass", display_name: "Bass", order_index: 2 },
        { step_name: "guitar", display_name: "Guitar", order_index: 3 },
        { step_name: "vocals", display_name: "Vocals", order_index: 4 },
        { step_name: "harmonies", display_name: "Harmonies", order_index: 5 },
        { step_name: "pro_keys", display_name: "Pro Keys", order_index: 6 },
        { step_name: "keys", display_name: "Keys", order_index: 7 },
        { step_name: "venue", display_name: "Venue", order_index: 8 },
        { step_name: "animations", display_name: "Animations", order_index: 9 },
        {
          step_name: "drum_fills",
          display_name: "Drum Fills",
          order_index: 10,
        },
        { step_name: "overdrive", display_name: "Overdrive", order_index: 11 },
        { step_name: "compile", display_name: "Compile", order_index: 12 },
      ];
      setDefaultSteps(fallbackSteps);
      setWorkflowSteps(fallbackSteps);
    }
  };

  const handleStep1Submit = () => {
    if (!selectedUserId && !isNewUser) {
      setError("Please select a user or choose to create a new account");
      return;
    }

    if (selectedUserId) {
      // Pre-fill username for claimed user
      const user = unclaimedUsers.find((u) => u.id === selectedUserId);
      if (user) {
        setUsername(user.username);
      }
    }

    setError("");
    setStep(2);
  };

  const handleStep2Submit = async () => {
    if (!email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (!isNewUser && !selectedUserId) {
      setError("No user selected");
      return;
    }

    if (isNewUser && !username) {
      setError("Username is required");
      return;
    }

    // Validate email format
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      setError("Invalid email format");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Check if username/email already exist (for new users)
    if (isNewUser) {
      setLoading(true);
      try {
        // Check if username exists
        const usersResponse = await apiGet("/auth/users");
        const existingUsernames = (usersResponse || []).map((u) =>
          u.username.toLowerCase()
        );

        if (existingUsernames.includes(username.toLowerCase())) {
          setError("Username already taken");
          setLoading(false);
          return;
        }

        // Check if email exists (we'll get an error from backend if it does, but check anyway)
        // Note: The /auth/users endpoint doesn't expose emails for privacy, so we'll rely on backend validation
      } catch (error) {
        console.error("Validation check failed:", error);
        // Continue anyway - backend will catch it
      } finally {
        setLoading(false);
      }
    }

    setError("");
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      let response;

      if (selectedUserId) {
        // Claim existing user
        response = await apiPost("/auth/claim-user", {
          user_id: selectedUserId,
          email,
          password,
          workflow_steps: workflowSteps,
        });
      } else {
        // Register new user
        response = await apiPost("/auth/register", {
          username,
          email,
          password,
          workflow_steps: workflowSteps,
        });
      }

      // Store token and user data
      localStorage.setItem("token", response.access_token);

      window.showNotification("Account created successfully!", "success");

      // Reload to trigger auth context
      window.location.href = "/wip";
    } catch (error) {
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const addWorkflowStep = () => {
    const newStep = {
      step_name: "",
      display_name: "",
      order_index: workflowSteps.length,
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const removeWorkflowStep = (index) => {
    const updated = workflowSteps.filter((_, i) => i !== index);
    // Reindex
    const reindexed = updated.map((step, i) => ({ ...step, order_index: i }));
    setWorkflowSteps(reindexed);
  };

  const updateWorkflowStep = (index, field, value) => {
    const updated = [...workflowSteps];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-generate step_name from display_name
    if (field === "display_name") {
      updated[index].step_name = value
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    }

    setWorkflowSteps(updated);
  };

  const moveStepUp = (index) => {
    if (index === 0) return;
    const updated = [...workflowSteps];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reindexed = updated.map((step, i) => ({ ...step, order_index: i }));
    setWorkflowSteps(reindexed);
  };

  const moveStepDown = (index) => {
    if (index === workflowSteps.length - 1) return;
    const updated = [...workflowSteps];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reindexed = updated.map((step, i) => ({ ...step, order_index: i }));
    setWorkflowSteps(reindexed);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <h2
          style={{ marginBottom: "1.5rem", textAlign: "center", color: "#333" }}
        >
          Create Account - Step {step} of 3
        </h2>

        {/* Progress indicator */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem" }}>
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              style={{
                flex: 1,
                height: "4px",
                background: num <= step ? "#007bff" : "#ddd",
                borderRadius: "2px",
              }}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {/* Step 1: User Selection */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: "1rem" }}>
              Are you one of these users?
            </h3>
            <p
              style={{
                color: "#666",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Some users may have been added as collaborators but never
              registered. If you recognize your username below, claim it to keep
              all your collaborations!
            </p>

            {unclaimedUsers.length > 0 && !isNewUser && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                  }}
                >
                  Select your existing username
                </label>
                <select
                  value={selectedUserId || ""}
                  onChange={(e) =>
                    setSelectedUserId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                >
                  <option value="">-- Select existing user --</option>
                  {unclaimedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ textAlign: "center", margin: "1.5rem 0" }}>
              <span style={{ color: "#999" }}>or</span>
            </div>

            <button
              onClick={() => {
                setIsNewUser(true);
                setSelectedUserId(null);
              }}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: isNewUser ? "#28a745" : "#f8f9fa",
                color: isNewUser ? "white" : "#333",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {isNewUser ? "✓ Creating new account" : "Create new account"}
            </button>

            <button
              onClick={handleStep1Submit}
              disabled={!selectedUserId && !isNewUser}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor:
                  !selectedUserId && !isNewUser ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor:
                  !selectedUserId && !isNewUser ? "not-allowed" : "pointer",
                marginTop: "1rem",
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Account Details */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>
              {selectedUserId ? "Claim Your Account" : "Create Your Account"}
            </h3>

            {isNewUser && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                  }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  placeholder="Choose a username"
                />
              </div>
            )}

            {selectedUserId && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: "#e7f3ff",
                  borderRadius: "4px",
                }}
              >
                <strong>Username:</strong> {username}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
                placeholder="your@email.com"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
                placeholder="Re-enter password"
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleStep2Submit}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Workflow Customization */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: "0.5rem" }}>Customize Your Workflow</h3>
            <p
              style={{
                color: "#666",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Define the steps you'll use to author songs. You can always change
              this later in settings.
            </p>

            <div
              style={{
                marginBottom: "1rem",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {workflowSteps.map((step, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#999", minWidth: "30px" }}>
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={step.display_name}
                    onChange={(e) =>
                      updateWorkflowStep(index, "display_name", e.target.value)
                    }
                    placeholder="Step name (e.g., Drums)"
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: index === 0 ? "#eee" : "#007bff",
                        color: index === 0 ? "#999" : "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStepDown(index)}
                      disabled={index === workflowSteps.length - 1}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background:
                          index === workflowSteps.length - 1
                            ? "#eee"
                            : "#007bff",
                        color:
                          index === workflowSteps.length - 1 ? "#999" : "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          index === workflowSteps.length - 1
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeWorkflowStep(index)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addWorkflowStep}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.9rem",
                cursor: "pointer",
                marginBottom: "1.5rem",
              }}
            >
              + Add Step
            </button>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={loading || workflowSteps.length === 0}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor:
                    loading || workflowSteps.length === 0 ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  cursor:
                    loading || workflowSteps.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading ? "Creating account..." : "Complete Registration"}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <p style={{ color: "#666" }}>
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationWizard;
