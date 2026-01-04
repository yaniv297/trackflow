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
    console.log("[AuthContext] Initial token from localStorage", { hasToken: !!storedToken });
    return storedToken;
  });
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginTimestamp, setLoginTimestamp] = useState(null);

  // Wrapper for setToken to track when it's cleared
  // We need to use a ref to avoid stale closure issues
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  
  const setTokenWithLogging = React.useCallback((newToken) => {
    const oldToken = tokenRef.current;
    const stackTrace = new Error().stack;
    
    console.log("[AuthContext] setToken called", {
      oldTokenExists: !!oldToken,
      newTokenExists: !!newToken,
      clearing: !newToken && !!oldToken,
      setting: !!newToken && !oldToken,
      updating: !!newToken && !!oldToken,
      stackTrace: stackTrace?.split('\n').slice(0, 5).join('\n'),
    });
    
    // If clearing token, store why
    if (!newToken && oldToken) {
      try {
        localStorage.setItem("token_cleared", JSON.stringify({
          timestamp: new Date().toISOString(),
          hadToken: true,
          stackTrace: stackTrace?.split('\n').slice(0, 10).join('\n'),
        }));
        console.error("[AuthContext] TOKEN CLEARED!", { stackTrace });
      } catch (e) {
        console.error("Failed to store token cleared:", e);
      }
    }
    
    setToken(newToken);
    tokenRef.current = newToken;
  }, []);

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
            
            // Log error to console (removed alert - too annoying)
            console.error(
              `[AuthContext] Auth Error:\n` +
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
              setTokenWithLogging(null);
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
          
          // Log error to console (removed alert - too annoying)
          console.error(
            `[AuthContext] Auth Exception:\n` +
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
            setTokenWithLogging(null);
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
    console.log("[AuthContext] Login started", { username, apiUrl: API_BASE_URL });
    
    // Store login attempt
    try {
      localStorage.setItem("login_attempt", JSON.stringify({
        timestamp: new Date().toISOString(),
        username,
        apiUrl: API_BASE_URL,
      }));
    } catch (e) {
      console.error("Failed to store login attempt:", e);
    }
    
    setIsLoggingIn(true);
    setLoginTimestamp(Date.now());
    try {
      console.log(`[AuthContext] Calling ${API_BASE_URL}/auth/login`);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      console.log(`[AuthContext] Login response status: ${response.status}`);
      
      // Store response status
      try {
        localStorage.setItem("login_response", JSON.stringify({
          status: response.status,
          ok: response.ok,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error("Failed to store login response:", e);
      }

      if (!response.ok) {
        const error = await response.json();
        console.error("[AuthContext] Login failed", { status: response.status, error });
        setIsLoggingIn(false);
        setLoginTimestamp(null);
        throw new Error(error.detail || "Login failed");
      }

      const data = await response.json();
      console.log("[AuthContext] Login successful, received token", {
        tokenPreview: data.access_token?.substring(0, 20) + "...",
        tokenLength: data.access_token?.length,
      });
      
      // Store token info BEFORE setting it
      try {
        localStorage.setItem("token_before_set", JSON.stringify({
          tokenPreview: data.access_token?.substring(0, 20) + "...",
          tokenLength: data.access_token?.length,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error("Failed to store token before set:", e);
      }
      
      console.log("[AuthContext] Setting token in state and localStorage");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.js:348',message:'Setting token in localStorage',data:{tokenLength:data.access_token?.length,tokenPreview:data.access_token?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion
      setTokenWithLogging(data.access_token);
      localStorage.setItem("token", data.access_token);
      // #region agent log
      const verifySet = localStorage.getItem("token");
      fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.js:350',message:'Token set verification',data:{tokenSet:!!verifySet,tokenMatches:verifySet===data.access_token,tokenLength:verifySet?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion
      // Store login timestamp for api.js to check
      localStorage.setItem("login_timestamp", Date.now().toString());
      
      // Check immediately after setting
      setTimeout(() => {
        const checkToken = localStorage.getItem("token");
        console.log("[AuthContext] Token check 100ms after set", {
          tokenStillExists: !!checkToken,
          tokenMatches: checkToken === data.access_token,
        });
        if (!checkToken) {
          console.error("[AuthContext] TOKEN WAS CLEARED IMMEDIATELY AFTER SET!");
          console.error("[AuthContext] CRITICAL: Token was cleared immediately after login! Check console.");
        }
      }, 100);
      
      // Verify token was set
      const verifyToken = localStorage.getItem("token");
      console.log("[AuthContext] Token verification after set", {
        tokenSet: !!verifyToken,
        tokenMatches: verifyToken === data.access_token,
        tokenPreview: verifyToken?.substring(0, 20) + "...",
      });
      
      // Store verification
      try {
        localStorage.setItem("token_after_set", JSON.stringify({
          tokenSet: !!verifyToken,
          tokenMatches: verifyToken === data.access_token,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error("Failed to store token after set:", e);
      }

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
      setTokenWithLogging(data.access_token);
      setUser(data.user);
      localStorage.setItem("token", data.access_token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    console.log("[AuthContext] Logout called");
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
      console.error("Token refresh failed:", error);
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
