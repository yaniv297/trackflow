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
  const [loginTimestamp, setLoginTimestamp] = useState(null);

  // Store error in localStorage for debugging
  const storeAuthError = (errorData) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        ...errorData,
      };
      localStorage.setItem("auth_error_log", JSON.stringify(errorLog));
      // Also keep last 5 errors
      const errorHistory = JSON.parse(localStorage.getItem("auth_error_history") || "[]");
      errorHistory.unshift(errorLog);
      if (errorHistory.length > 5) {
        errorHistory.pop();
      }
      localStorage.setItem("auth_error_history", JSON.stringify(errorHistory));
    } catch (e) {
      console.error("Failed to store auth error:", e);
    }
  };

  useEffect(() => {
    // Log immediately when useEffect runs
    console.log("[AuthContext] useEffect triggered", {
      hasToken: !!token,
      isLoggingIn,
      hasUser: !!user,
      loginTimestamp,
      apiUrl: API_BASE_URL,
    });
    
    // Store initial state for debugging
    try {
      localStorage.setItem("auth_debug_state", JSON.stringify({
        timestamp: new Date().toISOString(),
        hasToken: !!token,
        isLoggingIn,
        hasUser: !!user,
        loginTimestamp,
        apiUrl: API_BASE_URL,
      }));
    } catch (e) {
      console.error("Failed to store debug state:", e);
    }

    const checkAuth = async () => {
      if (token) {
        // Skip auth check if we just logged in (within last 5 seconds) and already have user data
        const timeSinceLogin = loginTimestamp ? Date.now() - loginTimestamp : Infinity;
        if (isLoggingIn && user && timeSinceLogin < 5000) {
          console.log("[AuthContext] Skipping auth check - just logged in and have user data");
          setLoading(false);
          return;
        }

        // Store error BEFORE making the request
        const errorData = {
          apiUrl: API_BASE_URL,
          tokenPreview: token.substring(0, 20) + "...",
          isLoggingIn,
          hasUser: !!user,
          timeSinceLogin: loginTimestamp ? Date.now() - loginTimestamp : null,
          timestamp: new Date().toISOString(),
        };
        
        // Store this BEFORE the fetch
        try {
          localStorage.setItem("auth_check_started", JSON.stringify(errorData));
        } catch (e) {
          console.error("Failed to store check start:", e);
        }

        console.log(`[AuthContext] Checking auth with ${API_BASE_URL}/auth/me`, errorData);
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          // Store response immediately
          const responseData = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            timestamp: new Date().toISOString(),
          };
          try {
            localStorage.setItem("auth_check_response", JSON.stringify(responseData));
          } catch (e) {
            console.error("Failed to store response:", e);
          }
          
          if (response.ok) {
            const userData = await response.json();
            console.log(
              `[AuthContext] Auth check successful for user: ${userData.username}`
            );
            setUser(userData);
            // Clear any stored errors on success
            localStorage.removeItem("auth_error_log");
            localStorage.removeItem("auth_check_started");
            localStorage.removeItem("auth_check_response");
          } else {
            // Token is invalid
            const errorText = await response.text();
            const fullErrorData = {
              ...errorData,
              status: response.status,
              statusText: response.statusText,
              body: errorText,
              errorType: "http_error",
            };
            
            console.error(
              `[AuthContext] Auth check failed: ${response.status} ${response.statusText}`,
              fullErrorData
            );
            
            // Store error persistently IMMEDIATELY
            storeAuthError(fullErrorData);
            
            // Also store in a simple format
            try {
              localStorage.setItem("auth_error_simple", JSON.stringify({
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 500),
                apiUrl: API_BASE_URL,
                timestamp: new Date().toISOString(),
              }));
            } catch (e) {
              console.error("Failed to store simple error:", e);
            }
            
            // Show alert that stays visible
            alert(
              `Auth Error:\n` +
              `Status: ${response.status} ${response.statusText}\n` +
              `API: ${API_BASE_URL}\n` +
              `Error: ${errorText.substring(0, 200)}\n\n` +
              `Check localStorage.auth_error_log or auth_error_simple`
            );
            
            // Don't clear token immediately after login - give it a longer chance
            const shouldClear = !isLoggingIn && timeSinceLogin > 10000; // 10 seconds grace period
            if (shouldClear) {
              console.log(`[AuthContext] Clearing token due to failed auth check`);
              localStorage.removeItem("token");
              setToken(null);
            } else {
              console.log(
                `[AuthContext] Skipping token clear - isLoggingIn=${isLoggingIn}, timeSinceLogin=${timeSinceLogin}ms`
              );
            }
          }
        } catch (error) {
          const fullErrorData = {
            ...errorData,
            errorMessage: error.message,
            errorStack: error.stack,
            errorType: "exception",
          };
          
          console.error("[AuthContext] Auth check failed with exception:", error, fullErrorData);
          
          // Store error persistently IMMEDIATELY
          storeAuthError(fullErrorData);
          
          // Also store in a simple format
          try {
            localStorage.setItem("auth_error_simple", JSON.stringify({
              errorMessage: error.message,
              errorStack: error.stack?.substring(0, 500),
              apiUrl: API_BASE_URL,
              timestamp: new Date().toISOString(),
            }));
          } catch (e) {
            console.error("Failed to store simple error:", e);
          }
          
          // Show alert that stays visible
          alert(
            `Auth Exception:\n` +
            `API: ${API_BASE_URL}\n` +
            `Error: ${error.message}\n\n` +
            `Check localStorage.auth_error_log or auth_error_simple`
          );
          
          // Don't clear token immediately after login - give it a longer chance
          const timeSinceLogin = loginTimestamp ? Date.now() - loginTimestamp : Infinity;
          const shouldClear = !isLoggingIn && timeSinceLogin > 10000; // 10 seconds grace period
          if (shouldClear) {
            console.log(`[AuthContext] Clearing token due to exception`);
            localStorage.removeItem("token");
            setToken(null);
          } else {
            console.log(
              `[AuthContext] Skipping token clear - isLoggingIn=${isLoggingIn}, timeSinceLogin=${timeSinceLogin}ms`
            );
          }
        }
      } else {
        console.log("[AuthContext] No token, skipping auth check");
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
          const errorData = {
            status: userResponse.status,
            statusText: userResponse.statusText,
            body: errorText,
            apiUrl: API_BASE_URL,
            errorType: "login_me_failed",
          };
          console.error(`Failed to fetch user data after login: ${userResponse.status}`, errorData);
          storeAuthError(errorData);
        }
      } catch (userError) {
        // If fetching user data fails, don't fail the login - user can still use the token
        const errorData = {
          errorMessage: userError.message,
          errorStack: userError.stack,
          apiUrl: API_BASE_URL,
          errorType: "login_me_exception",
        };
        console.error("Failed to fetch user data after login:", userError, errorData);
        storeAuthError(errorData);
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
