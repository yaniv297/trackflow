import React, { createContext, useContext, useState, useEffect } from "react";
import API_BASE_URL from "../config";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          console.log(
            `[AuthContext] Checking auth with ${API_BASE_URL}/auth/me`,
            {
              isLoggingIn,
              hasUser: !!user,
            }
          );
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            console.log(
              `[AuthContext] Auth check successful for user: ${userData.username}`
            );
            setUser(userData);
          } else {
            // Token is invalid, clear it
            const errorText = await response.text();
            console.error(
              `[AuthContext] Auth check failed: ${response.status} ${response.statusText}`,
              {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
                apiUrl: API_BASE_URL,
                tokenPreview: token.substring(0, 20) + "...",
                isLoggingIn,
              }
            );
            // Don't clear token immediately after login - give it a chance
            if (!isLoggingIn) {
              console.log(
                `[AuthContext] Clearing token due to failed auth check`
              );
              localStorage.removeItem("token");
              setToken(null);
            } else {
              console.log(
                `[AuthContext] Skipping token clear because isLoggingIn=true`
              );
            }
          }
        } catch (error) {
          console.error(
            "[AuthContext] Auth check failed with exception:",
            error,
            {
              apiUrl: API_BASE_URL,
              tokenPreview: token ? token.substring(0, 20) + "..." : "no token",
              errorMessage: error.message,
              errorStack: error.stack,
              isLoggingIn,
            }
          );
          // Don't clear token immediately after login - give it a chance
          if (!isLoggingIn) {
            console.log(`[AuthContext] Clearing token due to exception`);
            localStorage.removeItem("token");
            setToken(null);
          } else {
            console.log(
              `[AuthContext] Skipping token clear because isLoggingIn=true`
            );
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, isLoggingIn]);

  // Auto-refresh token every 23 hours (before the 24-hour expiration)
  useEffect(() => {
    if (!token) return;

    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 23 * 60 * 60 * 1000); // 23 hours

    return () => clearInterval(refreshInterval);
  }, [token]);

  const login = async (username, password) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        setIsLoggingIn(false);
        throw new Error(error.detail || "Login failed");
      }

      const data = await response.json();
      setToken(data.access_token);
      localStorage.setItem("token", data.access_token);

      // Fetch user data separately since backend doesn't include it in login response
      try {
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          // Check if this is user's first login by checking if last_login_at was just set
          if (userData.last_login_at) {
            const loginTime = new Date(userData.last_login_at);
            const now = new Date();
            const secondsSinceLogin = (now - loginTime) / 1000;

            // If last_login_at is very recent (< 5 seconds), it's first login
            if (secondsSinceLogin < 5) {
              sessionStorage.setItem("show_welcome", "true");
            }
          }
        } else {
          const errorText = await userResponse.text();
          console.error(
            `Failed to fetch user data after login: ${userResponse.status}`,
            {
              status: userResponse.status,
              statusText: userResponse.statusText,
              body: errorText,
              apiUrl: API_BASE_URL,
            }
          );
        }
      } catch (userError) {
        // If fetching user data fails, don't fail the login - user can still use the token
        console.error("Failed to fetch user data after login:", userError);
      }

      // Give a moment for the token to be validated before allowing auth checks to clear it
      setTimeout(() => {
        setIsLoggingIn(false);
      }, 2000);

      return data;
    } catch (error) {
      setIsLoggingIn(false);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Registration failed");
      }

      const data = await response.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("token", data.access_token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const refreshToken = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const updateAuth = async (newToken, username) => {
    // Update token
    setToken(newToken);
    localStorage.setItem("token", newToken);

    // Fetch user data with the new token
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    updateAuth,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
