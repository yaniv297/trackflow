import { API_BASE_URL } from "../config";

// Custom error class for API errors
export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// Get token from localStorage
const getToken = () => {
  const token = localStorage.getItem("token");
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:15',message:'getToken called',data:{hasToken:!!token,tokenLength:token?.length,tokenPreview:token?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return token;
};

// Create headers with authentication
const createHeaders = (customHeaders = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:27',message:'Authorization header set',data:{hasToken:!!token,tokenLength:token.length,headerValue:`Bearer ${token.substring(0,20)}...`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:30',message:'No token in headers',data:{hasToken:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }

  return headers;
};

// Generic API call function
export const apiCall = async (endpoint, options = {}) => {
  let url = `${API_BASE_URL}${endpoint}`;

  // Force HTTPS in production to prevent mixed content issues
  if (window.location.protocol === "https:" && url.startsWith("http:")) {
    url = url.replace("http:", "https:");
  }

  // Additional safety check - if we're on HTTPS page, ensure API calls are HTTPS
  if (window.location.hostname !== "localhost" && !url.startsWith("https:")) {
    url = url.replace("http:", "https:");
  }

  // Final safety check - ALWAYS use HTTPS in production
  if (
    window.location.hostname.includes("railway.app") &&
    url.startsWith("http:")
  ) {
    url = url.replace("http:", "https:");
  }

  // Special handling for bulk-delete endpoint to prevent Railway redirects
  if (
    endpoint.includes("bulk-delete") &&
    window.location.hostname.includes("railway.app")
  ) {
    // Force HTTPS and add extra cache-busting
    url = url.replace("http:", "https:");
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}_t=${Date.now()}&_cb=${Math.random()}`;
  }

  // Add cache-busting timestamp for production
  if (window.location.hostname.includes("railway.app")) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}_t=${Date.now()}`;
  }

  const headers = createHeaders(options.headers);

  const config = {
    ...options,
    headers,
    // Add mode: 'cors' to ensure CORS is handled properly
    mode: "cors",
  };

  try {
    // #region agent log
    const requestToken = getToken();
    fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:82',message:'API call starting',data:{endpoint:url,hasToken:!!requestToken,tokenLength:requestToken?.length,hasAuthHeader:!!config.headers?.Authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, config);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:85',message:'API response received',data:{endpoint:url,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      // Check if we just logged in (within last 10 seconds) - don't clear token immediately
      const loginTimestamp = localStorage.getItem("login_timestamp");
      const timeSinceLogin = loginTimestamp ? Date.now() - parseInt(loginTimestamp) : Infinity;
      const justLoggedIn = timeSinceLogin < 10000; // 10 seconds grace period
      
      // Try to get the actual error message from the response
      let errorDetail = "Unknown error";
      try {
        const errorText = await response.clone().text();
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.detail || errorJson.message || errorText;
        } catch {
          errorDetail = errorText;
        }
      } catch (e) {
        errorDetail = "Could not read error response";
      }
      
      console.error("[api.js] 401 error", {
        justLoggedIn,
        timeSinceLogin,
        endpoint: url,
        errorDetail,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      // Store the 401 error for debugging
      try {
        localStorage.setItem("api_401_error", JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: url,
          justLoggedIn,
          timeSinceLogin,
          errorDetail,
          status: response.status,
          statusText: response.statusText,
        }));
      } catch (e) {
        console.error("Failed to store 401 error:", e);
      }
      
      // Try to refresh the token first
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem("token", refreshData.access_token);

          // Retry the original request with the new token
          const newHeaders = createHeaders(options.headers);
          const retryResponse = await fetch(url, {
            ...config,
            headers: newHeaders,
          });

          if (retryResponse.ok) {
            if (
              retryResponse.status === 204 ||
              retryResponse.headers.get("content-length") === "0"
            ) {
              return null;
            }
            return await retryResponse.json();
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }

      // If refresh failed and we didn't just log in, redirect to login
      if (!justLoggedIn) {
        console.log("[api.js] Clearing token and redirecting - not just logged in");
        // Don't clear token immediately - give user a chance to see the error
        // The real fix is to set SECRET_KEY in both environments
        console.error("[api.js] CRITICAL: All API calls returning 401. This suggests SECRET_KEY mismatch between staging and production.");
        console.error("[api.js] Solution: Set the same SECRET_KEY environment variable in both staging and production backends.");
        console.error(
          "[api.js] Authentication Error:\n\n" +
          "All API calls are failing with 401 errors. This typically means the backend SECRET_KEY doesn't match.\n\n" +
          "Please set the same SECRET_KEY environment variable in both staging and production backends.\n\n" +
          "The token will not be cleared to allow debugging."
        );
        // Still throw error but don't clear token or redirect
        throw new Error("Authentication required - SECRET_KEY mismatch detected");
      } else {
        console.log("[api.js] Skipping token clear - just logged in, throwing error instead");
        throw new Error("Authentication required - please try again in a moment");
      }
    }

    if (!response.ok) {
      // Try to parse error response as JSON
      let errorData = {};
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
          // FastAPI typically returns errors in { detail: "message" } format
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } else {
          // Try to get text response as fallback
          const textResponse = await response.text();
          if (textResponse) {
            errorMessage = textResponse;
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, use default error message
        console.error("Failed to parse error response:", parseError);
      }
      
      // Throw structured API error with status code and message
      throw new ApiError(
        errorMessage,
        response.status,
        errorData.detail || errorData.message
      );
    }

    // Handle responses with no content (like DELETE endpoints)
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // If it's already an ApiError, re-throw it
    if (error instanceof ApiError) {
      console.error("API call failed:", error.message, `Status: ${error.status}`);
      throw error;
    }
    
    // For network errors (TypeError: Failed to fetch, etc.), wrap in ApiError
    // but mark as network error (no status code)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("API call failed: Network error", error);
      throw new ApiError(
        "Network error: Could not reach the server. Please check your connection.",
        null,
        null
      );
    }
    
    // For other errors, re-throw as-is
    console.error("API call failed:", error);
    throw error;
  }
};

// Convenience methods (authenticated)
export const apiGet = (endpoint) => apiCall(endpoint, { method: "GET" });
export const apiPost = (endpoint, data) =>
  apiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const apiPut = (endpoint, data) =>
  apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const apiPatch = (endpoint, data) =>
  apiCall(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const apiDelete = (endpoint) => apiCall(endpoint, { method: "DELETE" });

// Public API call function - doesn't require authentication
export const publicApiCall = async (endpoint, options = {}) => {
  let url = `${API_BASE_URL}${endpoint}`;

  // Force HTTPS in production
  if (window.location.protocol === "https:" && url.startsWith("http:")) {
    url = url.replace("http:", "https:");
  }

  if (window.location.hostname !== "localhost" && !url.startsWith("https:")) {
    url = url.replace("http:", "https:");
  }

  if (
    window.location.hostname.includes("railway.app") &&
    url.startsWith("http:")
  ) {
    url = url.replace("http:", "https:");
  }

  // Add cache-busting timestamp for production
  if (window.location.hostname.includes("railway.app")) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}_t=${Date.now()}`;
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    mode: "cors",
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      // For public endpoints, just throw the error without auth handling
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Public API call failed:", error);
    throw error;
  }
};

// Public convenience methods
export const publicApiGet = (endpoint) => publicApiCall(endpoint, { method: "GET" });
