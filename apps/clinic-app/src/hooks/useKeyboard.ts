import { useEffect, useCallback } from 'react';

const KEY_MAP: Record<string, string> = {
  F1: 'help',
  F2: 'newPatient',
  F3: 'queueTicket',
  F4: 'journal',
  F5: 'addService',
  F6: 'inpatient',
  F7: 'analytics',
  F8: 'selectDoctor',
  F9: 'settings',
  F10: 'payment',
  F11: 'fullscreen',
  F12: 'closeRegister',
};

const NAVIGATION_KEYS: Record<string, string> = {
  F1: 'help',
  F4: 'journal',
  F6: 'inpatient',
  F7: 'analytics',
  F9: 'settings',
};

interface KeyboardOptions {
  onNavigate?: (page: string) => void;
  onAction?: (action: string, key: string) => void;
}

export function useKeyboard({ onNavigate, onAction }: KeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const action = KEY_MAP[e.key];
    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    if (NAVIGATION_KEYS[e.key] && onNavigate) {
      onNavigate(NAVIGATION_KEYS[e.key]);
      return;
    }

    if (onAction) {
      onAction(action, e.key);
    }
  }, [onNavigate, onAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export { KEY_MAP, NAVIGATION_KEYS };
