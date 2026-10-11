import { layoutFlowchart } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { describe, expect, it } from 'vitest';
import { exportFrame } from './export-frame';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH } from './CourseNode';

const PADDING = 48;
const layout = layoutFlowchart(sampleCurriculum, sampleTranscript, { columnWidth: 264, rowHeight: 104 });

describe('exportFrame', () => {
  it('frames the default flowchart layout from the cards the grid places', () => {
    // Sample: 8 periods, tallest period has 6 courses.
    expect(layout.columns).toHaveLength(8);
    expect(Math.max(...layout.columns.map((c) => c.count))).toBe(6);

    const frame = exportFrame(layout.nodes, COURSE_NODE_WIDTH, COURSE_NODE_HEIGHT, PADDING);

    expect(frame.width).toBe(7 * 264 + 232 + 96);
    expect(frame.height).toBe((6 - 1) * 104 + 84 + 96);
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
