const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://trackflow-wb8l.onrender.com");

export default API_BASE_URL;
