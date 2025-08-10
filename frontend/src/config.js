// API configuration for different environments
// Updated to force HTTPS in production - rebuild required
const getApiUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    const url = process.env.REACT_APP_API_URL;
    // Force HTTPS if we're in production and the URL is HTTP
    if (window.location.protocol === "https:" && url.startsWith("http:")) {
      const httpsUrl = url.replace("http:", "https:");
      return httpsUrl;
    }
    return url;
  }

  // Check if we're in development
  if (window.location.hostname === "localhost") {
    console.log("Development mode detected, using localhost:8001");
    return "http://localhost:8001";
  }

  // For production, ALWAYS use HTTPS - hardcoded to prevent mixed content
  console.log("Production mode detected, using Railway URL");
  return "https://trackflow-api.up.railway.app";
};

export const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
