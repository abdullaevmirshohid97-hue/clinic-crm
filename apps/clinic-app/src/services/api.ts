import { supabase } from '../lib/supabase';

/**
 * Centralized API client for backend communication.
 * Uses Supabase session token for Authorization header.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem('clinic_token') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res: Response, url: string, method: string) {
  const data = await res.json();
  const timestamp = new Date().toLocaleTimeString();

  if (!res.ok || data.success === false) {
    console.error(`[${timestamp}] API ERROR: ${method} ${url}`, data);
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  console.log(`[${timestamp}] API SUCCESS: ${method} ${url}`, data);
  return data;
}

export const api = {
  async get(path: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}${path}${query ? '?' + query : ''}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse(res, url, 'GET');
  },

  async post(path: string, body: Record<string, unknown> = {}) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res, `${API_BASE}${path}`, 'POST');
  },

  async put(path: string, body: Record<string, unknown> = {}) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res, `${API_BASE}${path}`, 'PUT');
  },

  async delete(path: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res, `${API_BASE}${path}`, 'DELETE');
  },
};
