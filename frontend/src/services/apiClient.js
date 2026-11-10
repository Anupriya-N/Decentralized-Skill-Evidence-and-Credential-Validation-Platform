/**
 * Centralized API Client
 * Configured with environment variable VITE_API_URL and standard request handlers.
 * Injects JWT Bearer token automatically from localStorage.
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setToken(token) {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('certitrust_token', token);
      } else {
        localStorage.removeItem('certitrust_token');
      }
    }
  }

  getToken() {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('certitrust_token') : null;
  }

  async request(endpoint, options = {}) {
    // Normalise endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${cleanEndpoint}`;

    const token = this.getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: isFormData ? options.body : (options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      return await response.json();
    } catch (err) {
      // Log connection warnings for debugging
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.warn(`[ApiClient] Network connection failed to ${url}. Server might be offline.`);
      }
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body, headers });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body, headers });
  }

  patch(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PATCH', body, headers });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }

  upload(endpoint, formData, headers = {}) {
    return this.request(endpoint, { method: 'POST', body: formData, headers });
  }
}

export const apiClient = new ApiClient();
