import { API_BASE_URL } from "../config";

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
        console.error("Token refresh failed:", refreshError);
      }

      // If refresh failed, redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw new Error("Authentication required");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
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
    console.error("API call failed:", error);
    throw error;
  }
};

// Convenience methods
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
