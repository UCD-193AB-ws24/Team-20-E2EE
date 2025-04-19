import { BACKEND_URL } from "../config/config";

export default async function FetchWithAuth(url, options = {}) {
  // Always include cookies
  options.credentials = "include";

  let response = await fetch(url, options);

  if (response.status === 401) {
    // Try refreshing the token
    const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "GET",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      // Retry original request
      response = await fetch(url, options);
    } else {

      // Refresh failed, handle logout
      const logoutResponse = await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!logoutResponse.ok) {
        console.error("Logout failed");
      }

      localStorage.clear();

      console.log("Session expired. Please log in again.");
    }
  }

  return response;
}
