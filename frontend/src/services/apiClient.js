/**
 * Centralized API Client
 * Configured with environment variable VITE_API_URL and standard request handlers.
 * Injects JWT Bearer token automatically from localStorage with automatic refresh token rotation.
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

  clearSession() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('certitrust_token');
      localStorage.removeItem('certitrust_refresh_token');
      localStorage.removeItem('certitrust_current_user_v1');
    }
  }

  async request(endpoint, options = {}) {
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

      // Handle 401 Unauthorized with atomic refresh-token rotation
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token')) {
        const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('certitrust_refresh_token') : null;
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${this.baseURL}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccess = refreshData.data?.accessToken;
              const newRefresh = refreshData.data?.refreshToken;
              if (newAccess) {
                this.setToken(newAccess);
                if (newRefresh) {
                  localStorage.setItem('certitrust_refresh_token', newRefresh);
                }
                // Retry original request with new token
                const retryHeaders = {
                  ...headers,
                  Authorization: `Bearer ${newAccess}`,
                };
                const retryResponse = await fetch(url, {
                  ...options,
                  headers: retryHeaders,
                  body: isFormData ? options.body : (options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body)
                });
                if (retryResponse.ok) {
                  return await retryResponse.json();
                }
              }
            } else {
              this.clearSession();
            }
          } catch (_) {
            this.clearSession();
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      return await response.json();
    } catch (err) {
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
