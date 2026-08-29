import axios from "axios";

/**
 * Single API client for the whole app.
 *
 * `withCredentials` sends the httpOnly auth cookies on every request, so the
 * access token never has to be read from JavaScript — and therefore cannot be
 * stolen by injected script the way a localStorage token can.
 */

// Tolerate VITE_SERVER_URL being given with or without a trailing slash.
const baseURL = (import.meta.env.VITE_SERVER_URL || "http://localhost:8000/api/v1/")
  .replace(/\/+$/, "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const SERVER_ORIGIN = baseURL.replace(/\/api\/v1$/, "");

/**
 * Refresh-on-401.
 *
 * A single in-flight refresh is shared by every request that fails at once,
 * so a page that fires six parallel calls does not start six refreshes and
 * rotate itself out of a valid session.
 */
let refreshing = null;

const onUnauthorized = () => {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login?session=expired");
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (!response || response.status !== 401 || config?._retried) {
      return Promise.reject(error);
    }

    // The refresh call itself failing means the session is genuinely over.
    if (config.url?.includes("/auth/refresh-token")) {
      onUnauthorized();
      return Promise.reject(error);
    }

    // Never bounce someone off the login screen for failing to log in.
    if (config.url?.includes("/auth/login") || config.url?.includes("/auth/register")) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      refreshing = refreshing || api.post("/auth/refresh-token");
      await refreshing;
      return api(config);
    } catch (refreshError) {
      onUnauthorized();
      return Promise.reject(refreshError);
    } finally {
      refreshing = null;
    }
  }
);

export default api;
