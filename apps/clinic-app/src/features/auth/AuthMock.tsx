import { useEffect, useState } from 'react';

// Realistic mock login panel with token-like session (desktop app patch)
export default function AuthMock() {
  const [, setCurrent] = useState(0);
  const [username] = useState('');
  const [password] = useState('');

  useEffect(() => {
    // Try load from localStorage/session
    try {
      const id = Number(localStorage.getItem('clinic_user_id') || 0);
      setCurrent(id);
      window?.electronAPI?.auth?.getCurrentUser?.().then((id2) => setCurrent(id2 ?? id));
    } catch {
      /* storage or electron unavailable */
    }
  }, []);

  async function _login() {
    const uname = username.trim();
    if (!uname) return;
    // Simple deterministic id from username for mock
    const id = Math.abs(uname.charCodeAt(0) || 1) + 1;
    const token = btoa(uname + ':' + password);
    localStorage.setItem('clinic_token', token);
    localStorage.setItem('clinic_user_id', String(id));
    try {
      await window?.electronAPI?.auth?.setCurrentUser?.(id);
    } catch {
      /* electron unavailable */
    }
    setCurrent(id);
  }

  function _logout() {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user_id');
    try {
      window?.electronAPI?.auth?.setCurrentUser?.(0);
    } catch {
      /* electron unavailable */
    }
    setCurrent(0);
  }

  return null;
}
