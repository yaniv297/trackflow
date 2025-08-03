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
    console.log("Forced HTTPS for API call:", url);
  }

  const headers = createHeaders(options.headers);

  const config = {
    ...options,
    headers,
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
