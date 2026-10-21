import { layoutFlowchart } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { describe, expect, it } from 'vitest';
import { exportFrame, exportPixelRatio, MOBILE_EXPORT_LIMITS } from './export-frame';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH } from './CourseNode';

const PADDING = 48;
// The same grid the screen uses, so the test pins what the exported image actually frames.
const layout = layoutFlowchart(sampleCurriculum, sampleTranscript, { columnWidth: 264, rowHeight: 112 });

describe('exportFrame', () => {
  it('frames the default flowchart layout from the cards the grid places', () => {
    // Sample: 8 periods, tallest period has 6 courses.
    expect(layout.columns).toHaveLength(8);
    expect(Math.max(...layout.columns.map((c) => c.count))).toBe(6);

    const frame = exportFrame(layout.nodes, COURSE_NODE_WIDTH, COURSE_NODE_HEIGHT, PADDING);

    expect(frame.width).toBe(7 * 264 + COURSE_NODE_WIDTH + 96);
    expect(frame.height).toBe((6 - 1) * 112 + COURSE_NODE_HEIGHT + 96);
    expect(frame.offsetX).toBe(PADDING);
    expect(frame.offsetY).toBe(PADDING);
  });

  it('shifts the offset so the top-left card lands at the padding', () => {
    const frame = exportFrame([{ x: 300, y: 150 }, { x: 564, y: 254 }], 232, 84, 48);

    expect(frame.width).toBe(264 + 232 + 96);
    expect(frame.height).toBe(104 + 84 + 96);
    expect(frame.offsetX).toBe(48 - 300);
    expect(frame.offsetY).toBe(48 - 150);
  });

  it('returns an empty frame of just padding when there are no nodes', () => {
    expect(exportFrame([], 232, 84, 48)).toEqual({ width: 96, height: 96, offsetX: 48, offsetY: 48 });
  });
});

describe('exportPixelRatio', () => {
  it('exports at 4x on a desktop when the frame fits the canvas ceiling', () => {
    expect(exportPixelRatio({ width: 1200, height: 800 })).toBe(4);
  });

  // The full sample flowchart is 2176 px wide: the old 4096 px ceiling kept it near 1.9x and blurry on zoom.
  it('lets a wide flowchart reach the 8192 px desktop ceiling', () => {
    expect(exportPixelRatio({ width: 2176, height: 752 })).toBeCloseTo(8192 / 2176, 5);
  });

  it('shrinks the scale when the frame would cross the given ceiling', () => {
    expect(exportPixelRatio({ width: 2176, height: 1000 }, MOBILE_EXPORT_LIMITS)).toBeCloseTo(4096 / 2176, 5);
  });

  // The area cap binds before the side cap: 33.5 MP over 2.56 M CSS px is 3.62x, below the 4x maximum.
  it('caps the total pixels so a square graph does not blow the canvas memory', () => {
    expect(exportPixelRatio({ width: 1600, height: 1600 })).toBeCloseTo(Math.sqrt(33_554_432 / 2_560_000), 5);
  });

  it('never grows past the given maximum', () => {
    expect(exportPixelRatio({ width: 300, height: 200 })).toBe(4);
    expect(exportPixelRatio({ width: 300, height: 200 }, MOBILE_EXPORT_LIMITS)).toBe(3);
  });
});
