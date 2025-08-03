// API configuration for different environments
// Updated to force HTTPS in production - rebuild required
const getApiUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    const url = process.env.REACT_APP_API_URL;
    console.log("Environment variable found:", url);
    // Force HTTPS if we're in production and the URL is HTTP
    if (window.location.protocol === "https:" && url.startsWith("http:")) {
      const httpsUrl = url.replace("http:", "https:");
      console.log("Forced HTTPS in config:", httpsUrl);
      return httpsUrl;
    }
    return url;
  }

  console.log(
    "No environment variable, checking hostname:",
    window.location.hostname
  );

  // Check if we're in development
  if (window.location.hostname === "localhost") {
    console.log("Using localhost API URL");
    return "http://localhost:8001";
  }

  // For production, ALWAYS use HTTPS - hardcoded to prevent mixed content
  console.log("Using hardcoded production HTTPS API URL");
  return "https://trackflow-api.up.railway.app";
};

export const API_BASE_URL = getApiUrl();

console.log("Final API_BASE_URL:", API_BASE_URL);

export default API_BASE_URL;
