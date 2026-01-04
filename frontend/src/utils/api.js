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
  return localStorage.getItem("token");
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
    const response = await fetch(url, config);

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
        console.error("[api.js] All API calls returning 401. This suggests SECRET_KEY mismatch between staging and production.");
        throw new Error("Authentication required - SECRET_KEY mismatch detected");
      } else {
        throw new Error("Authentication required - please try again in a moment");
      }
    }

    if (!response.ok) {
      // Handle 403 Forbidden - likely SECRET_KEY mismatch across workers
      if (response.status === 403) {
        const loginTimestamp = localStorage.getItem("login_timestamp");
        const timeSinceLogin = loginTimestamp ? Date.now() - parseInt(loginTimestamp) : Infinity;
        const justLoggedIn = timeSinceLogin < 15000; // 15 seconds grace period
        
        console.error("[api.js] 403 Forbidden error", {
          justLoggedIn,
          timeSinceLogin,
          endpoint: url,
          message: "This usually indicates SECRET_KEY mismatch across backend workers",
        });
        
        // Store the 403 error for debugging
        try {
          localStorage.setItem("api_403_error", JSON.stringify({
            timestamp: new Date().toISOString(),
            endpoint: url,
            justLoggedIn,
            timeSinceLogin,
            status: response.status,
            statusText: response.statusText,
            message: "SECRET_KEY mismatch - each backend worker has different key",
          }));
        } catch (e) {
          console.error("Failed to store 403 error:", e);
        }
        
        if (!justLoggedIn) {
          console.error("[api.js] CRITICAL: 403 Forbidden errors indicate SECRET_KEY mismatch.");
          console.error("[api.js] Backend has multiple workers, each with different SECRET_KEY.");
          console.error("[api.js] SOLUTION: Set SECRET_KEY environment variable in Railway backend.");
        }
        
        throw new Error("Forbidden - SECRET_KEY mismatch detected");
      }
      
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
