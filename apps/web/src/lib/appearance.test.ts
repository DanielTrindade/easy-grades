import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_STORAGE_KEY, applyAppearance, readAppearance, useAppearance } from './appearance';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.appearance;
});

describe('readAppearance', () => {
  it('defaults to glass', () => {
    expect(readAppearance()).toBe('glass');
  });

  it('reads a stored solid choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'solid');
    expect(readAppearance()).toBe('solid');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'frosted');
    expect(readAppearance()).toBe('glass');
  });

  it('falls back to glass when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readAppearance()).toBe('glass');
  });
});

describe('applyAppearance', () => {
  it('sets data-appearance on the root element', () => {
    applyAppearance('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
    applyAppearance('glass');
    expect(document.documentElement.dataset.appearance).toBe('glass');
  });
});

describe('useAppearance', () => {
  it('starts from the stored choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'solid');
    const { result } = renderHook(() => useAppearance());
    expect(result.current[0]).toBe('solid');
  });

  it('applies, stores and returns a new choice', () => {
    const { result } = renderHook(() => useAppearance());
    act(() => result.current[1]('solid'));
    expect(result.current[0]).toBe('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('solid');
  });

  it('still applies the choice when storage cannot save it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useAppearance());
    act(() => result.current[1]('solid'));
    expect(result.current[0]).toBe('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
  });
});
