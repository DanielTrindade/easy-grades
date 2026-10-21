export interface ExportFrame {
  width: number;
  height: number;
  /** Translation that puts the top-left card at the padding, at scale 1. */
  offsetX: number;
  offsetY: number;
}

/**
 * Size of the PNG and the offset that frames every card at 1:1, from the layout positions and the fixed card size.
 * Does not read React Flow measurements: nodes that were never rendered have no size yet.
 */
export function exportFrame(
  nodes: { x: number; y: number }[],
  nodeWidth: number,
  nodeHeight: number,
  padding: number,
): ExportFrame {
  const minX = nodes.length === 0 ? 0 : Math.min(...nodes.map((n) => n.x));
  const minY = nodes.length === 0 ? 0 : Math.min(...nodes.map((n) => n.y));
  const maxX = nodes.length === 0 ? 0 : Math.max(...nodes.map((n) => n.x)) + nodeWidth;
  const maxY = nodes.length === 0 ? 0 : Math.max(...nodes.map((n) => n.y)) + nodeHeight;
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    offsetX: padding - minX,
    offsetY: padding - minY,
  };
}

export interface ExportLimits {
  /** Largest scale factor: past it the PNG only gains file size, not detail. */
  maxScale: number;
  /** Longest side of the canvas. */
  maxDimension: number;
  /** Total pixels of the canvas, which bounds the memory the browser spends rasterizing it. */
  maxPixels: number;
}

/**
 * Mobile Safari cannot draw a canvas past 4096 px in either dimension and hands back a blank image.
 * The full flowchart already fills that ceiling on a phone, and it is the safe resolution for a mobile canvas.
 */
export const MOBILE_EXPORT_LIMITS: ExportLimits = { maxScale: 3, maxDimension: 4096, maxPixels: 16_777_216 };

/**
 * On a desktop the PNG is opened to be zoomed into: 4x turns the 14 px card text into ~56 px, sharp well past
 * 200%. The 8192 px side and the 32 MP area stay under the usual canvas/GPU ceilings, so the export never comes
 * back blank or pushes the tab into swapping.
 */
export const DESKTOP_EXPORT_LIMITS: ExportLimits = { maxScale: 4, maxDimension: 8192, maxPixels: 33_554_432 };

/** Export scale: the largest of the limits the frame takes without crossing the canvas ceiling of the device. */
export function exportPixelRatio(
  frame: { width: number; height: number },
  limits: ExportLimits = DESKTOP_EXPORT_LIMITS,
): number {
  return Math.min(
    limits.maxScale,
    limits.maxDimension / frame.width,
    limits.maxDimension / frame.height,
    Math.sqrt(limits.maxPixels / (frame.width * frame.height)),
  );
}
