import { supabase } from '../utils/supabase';

/**
 * Centralized API client for backend communication.
 * Uses Supabase session token for Authorization header.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem('clinic_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  async get(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}${path}${query ? '?' + query : ''}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse(res);
  },

  async post(path, body = {}) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(path, body = {}) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(path) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },
};
