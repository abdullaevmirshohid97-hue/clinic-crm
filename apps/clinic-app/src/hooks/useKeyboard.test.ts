import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboard, KEY_MAP, NAVIGATION_KEYS } from './useKeyboard';

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('KEY_MAP', () => {
  it('maps F1 to help', () => expect(KEY_MAP.F1).toBe('help'));
  it('maps F10 to payment', () => expect(KEY_MAP.F10).toBe('payment'));
  it('maps F11 to fullscreen', () => expect(KEY_MAP.F11).toBe('fullscreen'));
  it('has 12 entries for F1-F12', () => expect(Object.keys(KEY_MAP)).toHaveLength(12));
});

describe('NAVIGATION_KEYS', () => {
  it('F1 navigates to help', () => expect(NAVIGATION_KEYS.F1).toBe('help'));
  it('F4 navigates to journal', () => expect(NAVIGATION_KEYS.F4).toBe('journal'));
  it('NAVIGATION_KEYS is a subset of KEY_MAP', () => {
    for (const key of Object.keys(NAVIGATION_KEYS)) {
      expect(KEY_MAP).toHaveProperty(key);
    }
  });
});

describe('useKeyboard hook', () => {
  let onNavigate: ReturnType<typeof vi.fn>;
  let onAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNavigate = vi.fn();
    onAction = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onNavigate when a navigation key is pressed', () => {
    renderHook(() => useKeyboard({ onNavigate, onAction }));
    fireKey('F1');
    expect(onNavigate).toHaveBeenCalledWith('help');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('calls onAction when a non-navigation mapped key is pressed', () => {
    renderHook(() => useKeyboard({ onNavigate, onAction }));
    fireKey('F2');
    expect(onAction).toHaveBeenCalledWith('newPatient', 'F2');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('calls onAction for F10 (payment)', () => {
    renderHook(() => useKeyboard({ onNavigate, onAction }));
    fireKey('F10');
    expect(onAction).toHaveBeenCalledWith('payment', 'F10');
  });

  it('does not call callbacks for unmapped keys', () => {
    renderHook(() => useKeyboard({ onNavigate, onAction }));
    fireKey('a');
    fireKey('Enter');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboard({ onNavigate, onAction }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('works when only onNavigate is provided', () => {
    renderHook(() => useKeyboard({ onNavigate }));
    fireKey('F4');
    expect(onNavigate).toHaveBeenCalledWith('journal');
  });

  it('works when only onAction is provided', () => {
    renderHook(() => useKeyboard({ onAction }));
    fireKey('F5');
    expect(onAction).toHaveBeenCalledWith('addService', 'F5');
  });
});
