import { NODE_LABELS, type NodeLabel } from '../graph/types';

export type WikilinkToken =
  | { type: 'text'; value: string }
  | { type: 'code-ref'; raw: string; path: string; startLine?: number; endLine?: number }
  | { type: 'node-ref'; raw: string; nodeType: NodeLabel; nodeName: string };

export type WikilinkRef = { kind: 'code-ref' | 'node-ref'; raw: string };

const NODE_LABEL_SET = new Set<string>(NODE_LABELS);

const CODE_REF_RE = /^([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)(?::(\d+)(?:[-–](\d+))?)?$/;
const NODE_REF_RE = /^(?:graph:)?([A-Za-z]+):(.+)$/;

function parseInner(inner: string): WikilinkToken | null {
  const trimmed = inner.trim();
  if (!trimmed) return null;

  const codeMatch = trimmed.match(CODE_REF_RE);
  if (codeMatch) {
    const path = codeMatch[1].trim();
    const startLine = codeMatch[2] ? parseInt(codeMatch[2], 10) : undefined;
    const endLine = codeMatch[3] ? parseInt(codeMatch[3], 10) : startLine;
    return {
      type: 'code-ref',
      raw: trimmed,
      path,
      startLine,
      endLine,
    };
  }

  const nodeMatch = trimmed.match(NODE_REF_RE);
  if (nodeMatch) {
    const nodeType = nodeMatch[1].trim();
    const nodeName = nodeMatch[2].trim();
    if (!nodeName || !NODE_LABEL_SET.has(nodeType)) return null;
    return {
      type: 'node-ref',
      raw: `${nodeType}:${nodeName}`,
      nodeType: nodeType as NodeLabel,
      nodeName,
    };
  }

  return null;
}

export function tokenizeWikilinks(input: string): WikilinkToken[] {
  if (!input) return [{ type: 'text', value: '' }];

  const tokens: WikilinkToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const open = input.indexOf('[[', cursor);
    if (open === -1) {
      tokens.push({ type: 'text', value: input.slice(cursor) });
      break;
    }

    if (open > cursor) {
      tokens.push({ type: 'text', value: input.slice(cursor, open) });
    }

    const close = input.indexOf(']]', open + 2);
    if (close === -1) {
      tokens.push({ type: 'text', value: input.slice(open) });
      break;
    }

    const inner = input.slice(open + 2, close);
    const parsed = parseInner(inner);
    if (parsed) {
      tokens.push(parsed);
    } else {
      tokens.push({ type: 'text', value: input.slice(open, close + 2) });
    }

    cursor = close + 2;
  }

  return tokens;
}

export function extractWikilinks(input: string): WikilinkRef[] {
  const refs: WikilinkRef[] = [];
  for (const token of tokenizeWikilinks(input)) {
    if (token.type === 'code-ref') refs.push({ kind: 'code-ref', raw: token.raw });
    if (token.type === 'node-ref') refs.push({ kind: 'node-ref', raw: token.raw });
  }
  return refs;
}
