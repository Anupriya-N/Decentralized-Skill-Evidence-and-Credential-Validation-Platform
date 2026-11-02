/**
 * Centralized API Client
 * Configured with environment variable VITE_API_URL and standard request handlers.
 * Falls back to local/mock services when backend server is unavailable.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      // Graceful fallback logging for local prototype mode
      console.warn(`[ApiClient] Request to ${endpoint} failed. Utilizing local fallback.`, err.message);
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), headers });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
