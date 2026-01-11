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
        // Token refresh failed silently
      }

      throw new Error("Authentication required");
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
      throw error;
    }
    
    // For network errors (TypeError: Failed to fetch, etc.), wrap in ApiError
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        "Network error: Could not reach the server. Please check your connection.",
        null,
        null
      );
    }
    
    // For other errors, re-throw as-is
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
    throw error;
  }
};

// Public convenience methods
export const publicApiGet = (endpoint) => publicApiCall(endpoint, { method: "GET" });
