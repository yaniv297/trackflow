// API configuration for different environments
const getApiUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Check if we're in development
  if (window.location.hostname === "localhost") {
    return "http://localhost:8001";
  }

  // For production, you'll need to update this with your Railway URL
  // This will be replaced after you deploy to Railway
  return "https://trackflow-api.up.railway.app/";
};

export const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
