import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickFlowView, readStoredFlowView, writeFlowView } from './flow-view';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('pickFlowView', () => {
  // The graph is the screen's identity; on a phone it is still reachable and exportable, so it opens everywhere.
  it('opens as the graph when nothing is stored, whatever the width', () => {
    expect(pickFlowView(null)).toBe('grafo');
  });

  it('keeps the stored choice', () => {
    expect(pickFlowView('grafo')).toBe('grafo');
    expect(pickFlowView('lista')).toBe('lista');
  });

  it('ignores an unknown stored value and falls back to the graph', () => {
    expect(pickFlowView('xyz')).toBe('grafo');
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
