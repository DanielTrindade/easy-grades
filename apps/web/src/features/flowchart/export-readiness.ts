export function isExportGraphReady(
  expectedNodeIds: readonly string[],
  visibleNodeIds: ReadonlySet<string>,
  expectedEdgeIds: readonly string[],
  edgePathIds: ReadonlySet<string>,
): boolean {
  return (
    expectedNodeIds.every((id) => visibleNodeIds.has(id)) &&
    expectedEdgeIds.every((id) => edgePathIds.has(id))
  );
}
