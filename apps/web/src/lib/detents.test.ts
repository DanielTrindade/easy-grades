import { describe, expect, it } from 'vitest';
import { DETENT_FRACTION, detentTop, resolveDetent } from './detents';

const vh = 800;
const both = ['medium', 'large'] as const;

describe('DETENT_FRACTION', () => {
  it('pins the fraction of the visible height per detent', () => {
    expect(DETENT_FRACTION).toEqual({ medium: 0.5, large: 0.92 });
  });
});

describe('detentTop', () => {
  it('places medium at half the screen and large near the top', () => {
    expect(detentTop('medium', vh)).toBe(400);
    expect(detentTop('large', vh)).toBeCloseTo(64);
  });

  it('scales the top with the viewport height', () => {
    expect(detentTop('medium', 640)).toBe(320);
    expect(detentTop('large', 1000)).toBeCloseTo(80);
  });
});

describe('resolveDetent', () => {
  it('stays put after a tiny drag', () => {
    expect(resolveDetent({ current: 'medium', offset: 10, velocity: 0, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('settles on the nearest detent when released between two', () => {
    expect(resolveDetent({ current: 'medium', offset: -250, velocity: 0, viewportHeight: vh, detents: both })).toBe('large');
    expect(resolveDetent({ current: 'medium', offset: -100, velocity: 0, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('closes when dragged well below the smallest detent', () => {
    expect(resolveDetent({ current: 'medium', offset: 260, velocity: 0, viewportHeight: vh, detents: both })).toBe('close');
  });

  it('closes on a fast downward flick from medium', () => {
    expect(resolveDetent({ current: 'medium', offset: 40, velocity: 1.5, viewportHeight: vh, detents: both })).toBe('close');
  });

  it('drops one detent, not all the way, on a fast flick from large', () => {
    expect(resolveDetent({ current: 'large', offset: 60, velocity: 1.5, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('expands on a fast upward flick', () => {
    expect(resolveDetent({ current: 'medium', offset: -40, velocity: -1.5, viewportHeight: vh, detents: both })).toBe('large');
    expect(resolveDetent({ current: 'medium', offset: 0, velocity: -1.5, viewportHeight: vh, detents: both })).toBe('large');
  });

  it('never goes past the largest detent when dragged above it', () => {
    expect(resolveDetent({ current: 'large', offset: -200, velocity: 0, viewportHeight: vh, detents: both })).toBe('large');
    expect(resolveDetent({ current: 'large', offset: -30, velocity: -1.5, viewportHeight: vh, detents: both })).toBe('large');
  });

  it('does not skip the medium detent on a long downward drag from large', () => {
    expect(resolveDetent({ current: 'large', offset: 300, velocity: 0, viewportHeight: vh, detents: both })).toBe('medium');
    expect(resolveDetent({ current: 'large', offset: 60, velocity: 0.8, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('only offers the detents the sheet has', () => {
    expect(resolveDetent({ current: 'large', offset: 300, velocity: 0, viewportHeight: vh, detents: ['large'] })).toBe('large');
    expect(resolveDetent({ current: 'large', offset: 450, velocity: 0, viewportHeight: vh, detents: ['large'] })).toBe('close');
  });

  it('closes from the only detent a sheet has', () => {
    expect(resolveDetent({ current: 'medium', offset: 20, velocity: 0, viewportHeight: vh, detents: ['medium'] })).toBe('medium');
    expect(resolveDetent({ current: 'medium', offset: 260, velocity: 0, viewportHeight: vh, detents: ['medium'] })).toBe('close');
    expect(resolveDetent({ current: 'medium', offset: 40, velocity: 1.5, viewportHeight: vh, detents: ['medium'] })).toBe('close');
  });
});
