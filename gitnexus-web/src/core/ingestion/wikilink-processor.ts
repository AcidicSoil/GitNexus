import { GraphRelationship, GraphNode } from '../graph/types';
import { generateId } from '../../lib/utils';

export type WikilinkRefInput = { kind: 'code-ref' | 'node-ref'; raw: string };

export function buildWikilinkRelations(
  sourceId: string,
  links: WikilinkRefInput[],
  resolveNodeId: (labelOrPath: string) => string | null
): GraphRelationship[] {
  const relationships: GraphRelationship[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const resolvedId = resolveNodeId(link.raw);
    if (!resolvedId) continue;

    const dedupeKey = `${sourceId}->${resolvedId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    relationships.push({
      id: generateId('REFERENCES', dedupeKey),
      sourceId,
      targetId: resolvedId,
      type: 'REFERENCES',
      confidence: 1,
      reason: 'wikilink',
    });
  }

  return relationships;
}

export function createWikilinkNodeResolver(nodes: GraphNode[]): (labelOrPath: string) => string | null {
  const normalizedFilePathToId = new Map<string, string>();
  const nodeKeyToId = new Map<string, string>();

  for (const node of nodes) {
    const filePath = (node.properties.filePath || '').replace(/\\/g, '/').replace(/^\.?\//, '');
    if (filePath) normalizedFilePathToId.set(filePath.toLowerCase(), node.id);

    const key = `${node.label}:${node.properties.name}`.toLowerCase();
    nodeKeyToId.set(key, node.id);
  }

  return (labelOrPath: string): string | null => {
    const raw = labelOrPath.trim();
    if (!raw) return null;

    const nodeIdByKey = nodeKeyToId.get(raw.toLowerCase());
    if (nodeIdByKey) return nodeIdByKey;

    const rawLower = raw.toLowerCase();
    const pathOnly = raw.replace(/:(\d+)(?:[-–](\d+))?$/, '');
    const normalizedPath = pathOnly.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();

    if (normalizedFilePathToId.has(normalizedPath)) {
      return normalizedFilePathToId.get(normalizedPath)!;
    }

    for (const [candidatePath, id] of normalizedFilePathToId.entries()) {
      if (candidatePath.endsWith(normalizedPath) || normalizedPath.endsWith(candidatePath) || candidatePath.endsWith(rawLower)) {
        return id;
      }
    }

    return null;
  };
}
