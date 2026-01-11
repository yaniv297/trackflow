import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    return storedToken;
  });
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginTimestamp, setLoginTimestamp] = useState(null);

  // Wrapper for setToken with ref to avoid stale closure issues
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  
  const setTokenWithLogging = React.useCallback((newToken) => {
    setToken(newToken);
    tokenRef.current = newToken;
  }, []);

  useEffect(() => {

    const checkAuth = async () => {
      if (token) {
        // Skip auth check if we just logged in (within last 5 seconds) and already have user data
        const timeSinceLogin = loginTimestamp ? Date.now() - loginTimestamp : Infinity;
        if (isLoggingIn && user && timeSinceLogin < 5000) {
          setLoading(false);
          return;
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token is invalid - clear it silently (this is expected when not logged in)
            const shouldClear = !isLoggingIn && timeSinceLogin > 10000; // 10 seconds grace period
            if (shouldClear) {
              localStorage.removeItem("token");
              setTokenWithLogging(null);
            }
          }
        } catch (error) {
          // Network error - clear token silently if not recently logged in
          const timeSinceLogin = loginTimestamp ? Date.now() - loginTimestamp : Infinity;
          const shouldClear = !isLoggingIn && timeSinceLogin > 10000; // 10 seconds grace period
          if (shouldClear) {
            localStorage.removeItem("token");
            setTokenWithLogging(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, isLoggingIn, loginTimestamp]);

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
    setLoginTimestamp(Date.now());
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
        setLoginTimestamp(null);
        throw new Error(error.detail || "Login failed");
      }

      const data = await response.json();
      setTokenWithLogging(data.access_token);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("login_timestamp", Date.now().toString());

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
          if (userData && userData.last_login_at) {
            const loginTime = new Date(userData.last_login_at);
            const now = new Date();
            const secondsSinceLogin = (now - loginTime) / 1000;

            // If last_login_at is very recent (< 5 seconds), it's first login
            if (secondsSinceLogin < 5) {
              sessionStorage.setItem("show_welcome", "true");
            }
          }
        }
      } catch (userError) {
        // If fetching user data fails, don't fail the login - user can still use the token
      }

      // Give a longer grace period for the token to be validated before allowing auth checks to clear it
      setTimeout(() => {
        setIsLoggingIn(false);
      }, 10000); // 10 seconds grace period

      return data;
    } catch (error) {
      setIsLoggingIn(false);
      setLoginTimestamp(null);
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
      setTokenWithLogging(data.access_token);
      setUser(data.user);
      localStorage.setItem("token", data.access_token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setTokenWithLogging(null);
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
        setTokenWithLogging(data.access_token);
        localStorage.setItem("token", data.access_token);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const updateAuth = async (newToken, username) => {
    // Update token
    setTokenWithLogging(newToken);
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
      // Silently fail - user data fetch is not critical
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
