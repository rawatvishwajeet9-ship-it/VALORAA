/**
 * VALORA Healthcare Management Platform - Central API Client
 */

const API_BASE = '/api';

// Toast Notification Manager
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;
window.escapeHTML = escapeHtml;

// Get stored logged-in user
function getCurrentUser() {
  const stored = localStorage.getItem('valora_user') || sessionStorage.getItem('valora_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
}

// Store logged-in user
function setCurrentUser(user, remember = true) {
  const json = JSON.stringify(user);
  if (remember) {
    localStorage.setItem('valora_user', json);
  } else {
    sessionStorage.setItem('valora_user', json);
  }
}

// Clear logged-in user
function clearCurrentUser() {
  localStorage.removeItem('valora_user');
  sessionStorage.removeItem('valora_user');
}

// Core API Request Helper
async function apiRequest(endpoint, options = {}) {
  const user = getCurrentUser();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (user && user.id) {
    headers['X-User-Id'] = String(user.id);
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errMsg);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

// HTTP Verbs
const api = {
  get: (endpoint, params = {}) => {
    let url = endpoint;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return apiRequest(url, { method: 'GET' });
  },

  post: (endpoint, body = {}) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: (typeof FormData !== 'undefined' && body instanceof FormData) ? body : JSON.stringify(body)
    });
  },

  put: (endpoint, body = {}) => {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: (typeof FormData !== 'undefined' && body instanceof FormData) ? body : JSON.stringify(body)
    });
  },

  patch: (endpoint, body = {}) => {
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: (typeof FormData !== 'undefined' && body instanceof FormData) ? body : JSON.stringify(body)
    });
  },

  delete: (endpoint) => {
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  upload: (endpoint, formData) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};
