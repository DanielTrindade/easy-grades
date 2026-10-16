import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, relativeLuminance } from './contrast';

describe('parseHex', () => {
  it('reads a 6-digit hex color in either case', () => {
    expect(parseHex('#2A5BD7')).toEqual([42, 91, 215]);
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
  });

  it('rejects anything that is not #rrggbb', () => {
    expect(() => parseHex('#fff')).toThrow();
    expect(() => parseHex('var(--ink)')).toThrow();
    expect(() => parseHex('2a5bd7')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 between black and white, in either order', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
  });

  it('is 1 for the same color', () => {
    expect(contrastRatio([42, 91, 215], [42, 91, 215])).toBe(1);
  });

  it('matches the WCAG value for the pen blue on white', () => {
    expect(contrastRatio(parseHex('#2a5bd7'), parseHex('#ffffff'))).toBeCloseTo(5.87, 2);
  });
});

describe('composite', () => {
  it('returns the top color at alpha 1 and the bottom one at alpha 0', () => {
    expect(composite([255, 255, 255], [0, 0, 0], 1)).toEqual([255, 255, 255]);
    expect(composite([255, 255, 255], [0, 0, 0], 0)).toEqual([0, 0, 0]);
  });

  it('mixes linearly in between', () => {
    expect(composite([200, 100, 0], [0, 100, 200], 0.75)).toEqual([150, 100, 50]);
  });
});
