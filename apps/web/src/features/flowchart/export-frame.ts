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

/** Mobile Safari cannot draw a canvas past 4096 px in either dimension and hands back a blank image. */
export const MAX_EXPORT_PX = 4096;

/** Export scale: up to 2x, shrunk only when the frame would cross the canvas ceiling of mobile Safari. */
export function exportPixelRatio(frame: { width: number; height: number }, max = 2): number {
  return Math.min(max, MAX_EXPORT_PX / frame.width, MAX_EXPORT_PX / frame.height);
}
