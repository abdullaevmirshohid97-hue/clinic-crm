import { supabase } from '../lib/supabase';

/**
 * Centralized API client for backend communication.
 * Uses Supabase session token for Authorization header.
 */

const rawApiBase = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

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
  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();
  let data: any = null;

  if (raw) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`API JSON parse xatosi (${method} ${url})`);
      }
    } else {
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
    }
  }
  const timestamp = new Date().toLocaleTimeString();

  if (!res.ok || data?.success === false) {
    if (contentType.includes('text/html') || raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
      throw new Error(
        `Server JSON o'rniga HTML qaytardi. API manzilini tekshiring (VITE_API_URL) va endpoint mavjudligini tasdiqlang.`
      );
    }

    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  if (data === null && raw.length > 0) {
    throw new Error(`Serverdan JSON javob kelmadi (${method} ${url})`);
  }

  console.log(`[${timestamp}] API SUCCESS: ${method} ${url}`, data);
  return data ?? {};
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
