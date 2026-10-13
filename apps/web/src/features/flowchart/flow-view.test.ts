import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickFlowView, readStoredFlowView, writeFlowView } from './flow-view';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('pickFlowView', () => {
  it('opens as a list below md (768 px) when nothing is stored', () => {
    expect(pickFlowView(390, null)).toBe('lista');
    expect(pickFlowView(767, null)).toBe('lista');
  });

  it('opens as the graph from md up when nothing is stored', () => {
    expect(pickFlowView(768, null)).toBe('grafo');
    expect(pickFlowView(1440, null)).toBe('grafo');
  });

  it('keeps the stored choice at any width', () => {
    expect(pickFlowView(390, 'grafo')).toBe('grafo');
    expect(pickFlowView(1440, 'lista')).toBe('lista');
  });

  it('ignores an unknown stored value and falls back to the width default', () => {
    expect(pickFlowView(390, 'xyz')).toBe('lista');
    expect(pickFlowView(1440, 'xyz')).toBe('grafo');
  });
});

describe('flow view storage', () => {
  it('round-trips the choice under the eg:flow-view key', () => {
    writeFlowView('lista');
    expect(localStorage.getItem('eg:flow-view')).toBe('lista');
    expect(readStoredFlowView()).toBe('lista');
  });

  it('treats an unavailable localStorage as nothing stored, without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredFlowView()).toBeNull();
    expect(() => writeFlowView('grafo')).not.toThrow();
  });
});
