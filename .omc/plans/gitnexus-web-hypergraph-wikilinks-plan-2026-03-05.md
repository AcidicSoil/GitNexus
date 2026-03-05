# GitNexus Web Plan: Hypergraph-Style Wikilinks in Prose

Date: 2026-03-05
Scope: `gitnexus-web`
Source context: `gitnexus-hypergraph-chat.md`

## Requirements Summary

1. Preserve and strengthen GitNexus’s existing wikilink UX (clickable inline links in assistant markdown) and align behavior with Hypergraph-style “links woven into prose” guidance.
2. Remove duplicated wikilink parsing logic across UI/state flows by introducing one canonical parser and token model.
3. Ensure wikilink clicks reliably navigate to either code references or graph nodes and focus selection consistently.
4. Extend node wikilinks to match graph schema labels (including `Community` and `Process`) while keeping current formats backward-compatible.
5. Add ingestion support for optional wikilink-derived graph relations from parsed markdown/doc text.
6. Add generator/validator rule for “prose-justified wikilinks” in LLM outputs.

## Current-State Facts (grounded)

- `MarkdownRenderer` already converts `[[...]]` patterns to clickable markdown links (`code-ref:` / `node-ref:`) and intercepts link clicks via `onLinkClick`.
  - `gitnexus-web/src/components/MarkdownRenderer.tsx:28-32`
  - `gitnexus-web/src/components/MarkdownRenderer.tsx:84-117`
- `RightPanel` already routes `code-ref:` and `node-ref:` click events to handlers and parses citation-like links from content.
  - `gitnexus-web/src/components/RightPanel.tsx:84-168`
  - `gitnexus-web/src/components/RightPanel.tsx:263-279`
- App state already parses streamed assistant wikilinks and converts them into `CodeReference` entries.
  - `gitnexus-web/src/hooks/useAppState.tsx:36-52`
  - `gitnexus-web/src/hooks/useAppState.tsx:520-576`
  - `gitnexus-web/src/hooks/useAppState.tsx:942-1003`
- Graph focus behavior exists through `GraphCanvasHandle.focusNode(nodeId)`.
  - `gitnexus-web/src/components/GraphCanvas.tsx:9-11`
  - `gitnexus-web/src/components/GraphCanvas.tsx:102-114`
- Node label schema includes labels not covered by current node-ref regexes (`Community`, `Process`).
  - `gitnexus-web/src/core/graph/types.ts:1-18`
  - `gitnexus-web/src/components/MarkdownRenderer.tsx:99-106`
  - `gitnexus-web/src/hooks/useAppState.tsx:977`
- Ingestion currently creates relationships like `DEFINES`, `MEMBER_OF`, and `STEP_IN_PROCESS`, but no dedicated wikilink relation type.
  - `gitnexus-web/src/core/ingestion/parsing-processor.ts:240-251`
  - `gitnexus-web/src/core/ingestion/pipeline.ts:214-221`
  - `gitnexus-web/src/core/ingestion/pipeline.ts:271-279`
  - `gitnexus-web/src/core/graph/types.ts:46-58`
- LLM system prompt already enforces citation grounding format.
  - `gitnexus-web/src/core/llm/agent.ts:51-70`

## Architecture Decision

### Decision
Adopt a **single wikilink parsing core** used by renderer, right panel, and streaming ingestion; then incrementally extend navigation, relation extraction, and LLM validation.

### Why this approach
- Minimizes regression risk by preserving existing surface APIs and wiring.
- Removes parser drift by consolidating regex/grammar in one module.
- Enables extension (additional node labels and relation types) without repeated edits.

### Alternatives considered
1. Keep duplicated parsers and patch each location independently.
   - Rejected: high long-term drift risk and inconsistent behavior.
2. Full rewrite of markdown rendering and reference system.
   - Rejected: unnecessary blast radius; existing architecture already has hooks.

### Consequences
- Small shared utility surface will become dependency for UI and state.
- Tests need to move from implicit behavior checks to parser-contract tests.

## Implementation Steps (file-by-file)

### Delivery mode (required for each implementation step)
- RED: Add/adjust tests first and confirm failure.
- GREEN: Implement minimal code to pass tests.
- REFACTOR: Clean up while preserving green tests.
- Record test evidence in PR notes (which tests failed first and then passed).

### Phase 0 — Test Infrastructure (blocking)
1. Add test tooling and config before feature work:
   - Add Vitest + React testing deps and jsdom test environment.
   - Add scripts: `test`, `test:watch`.
   - Add test setup file and TypeScript test globals.
2. Exit criteria:
   - Minimal smoke test runs successfully via `npm run test`.

### Security Invariant (applies to Phases 1, 2, and 4)
- Only `code-ref:` and `node-ref:` schemes are accepted for wikilink navigation.
- All non-custom links must use `react-markdown` safe URL handling (no identity passthrough for untrusted schemes).
- Ignore/reject unsafe schemes like `javascript:` and `data:` in click routing.
- Treat parser output as untrusted input at boundaries; validate before resolver/lookup use.

### Phase 1 — Canonical wikilink parser (no behavior change intended)

1. **Create parser module**: `gitnexus-web/src/core/wikilinks/parser.ts`
   - Add exact signatures:
     - `export type WikilinkToken = { type: 'text'; value: string } | { type: 'code-ref'; raw: string; path: string; startLine?: number; endLine?: number } | { type: 'node-ref'; raw: string; nodeType: string; nodeName: string };`
     - `export function tokenizeWikilinks(input: string): WikilinkToken[];`
     - `export function extractWikilinks(input: string): Array<{ kind: 'code-ref' | 'node-ref'; raw: string }>;`
   - Grammar compatibility target (preserve existing behavior):
     - code refs: `[[path.ext]]`, `[[path.ext:line]]`, `[[path.ext:start-end]]`
     - node refs: `[[Type:Name]]`, `[[graph:Type:Name]]`

2. **Refactor `MarkdownRenderer` to use parser**
   - Replace inline regex transforms in `formatMarkdownForDisplay` with parser-driven transform using a markdown AST/plugin path (avoid brittle raw string rewrites).
   - Preserve `react-markdown` URL safety for non-custom links; only custom `code-ref:`/`node-ref:` links should bypass default handling.
   - Keep props stable:
     - `interface MarkdownRendererProps { content: string; onLinkClick?: (href: string) => void; toolCalls?: any[]; }`
     - `export const MarkdownRenderer: React.FC<MarkdownRendererProps>`
   - Grounding references:
     - `gitnexus-web/src/components/MarkdownRenderer.tsx:28-32`
     - `gitnexus-web/src/components/MarkdownRenderer.tsx:84-117`

3. **Refactor `RightPanel.extractCitationsFromContent` to use parser**
   - Keep signature:
     - `const extractCitationsFromContent = useCallback((content: string): string[] => { ... })`
   - Replace duplicate regex scanning with parser extraction.
   - Grounding reference:
     - `gitnexus-web/src/components/RightPanel.tsx:263-279`

4. **Refactor stream parsing in `useAppState` to use parser**
   - Replace local regex loops in assistant response handling with parser output iteration.
   - Preserve existing dedupe/add semantics via `addCodeReference`.
   - Grounding references:
     - `gitnexus-web/src/hooks/useAppState.tsx:520-552`
     - `gitnexus-web/src/hooks/useAppState.tsx:942-1003`

### Phase 2 — Navigation and focus consistency

5. **Improve node-ref resolution in `RightPanel`**
   - Existing signature to retain:
     - `const handleNodeGroundingClick = useCallback((nodeTypeAndName: string) => { ... })`
   - Add robust lookup strategy:
     - exact label/name
     - case-insensitive fallback
     - optional disambiguation when multiple matches exist
   - Define one canonical node-navigation action so node-ref clicks always update selected node and trigger graph focus path deterministically.
   - Grounding references:
     - `gitnexus-web/src/components/RightPanel.tsx:117-158`
     - `gitnexus-web/src/components/GraphCanvas.tsx:9-11`
     - `gitnexus-web/src/components/GraphCanvas.tsx:102-114`

6. **Expand supported node types to graph schema**
   - Include `Community` and `Process` in node ref parsing where applicable.
   - Add/export runtime node label constants (single source of truth) and derive parser/router allowed labels from them.
   - For node types without `filePath` (e.g., `Community`/`Process`), route to graph selection/focus only (no required code-reference insertion).
   - Grounding references:
     - `gitnexus-web/src/core/graph/types.ts:1-18`
     - `gitnexus-web/src/components/MarkdownRenderer.tsx:99-106`
     - `gitnexus-web/src/hooks/useAppState.tsx:977`

### Phase 3 — Ingestion-side wikilink relations

7. **Extend relationship schema** in `src/core/graph/types.ts`
   - Add relation type:
     - `| 'REFERENCES'`
   - Keep `GraphRelationship` unchanged except allowed type union.
   - Grounding references:
     - `gitnexus-web/src/core/graph/types.ts:46-58`
     - `gitnexus-web/src/core/graph/types.ts:66-77`

8. **Add wikilink relation builder** in ingestion core
   - New helper (proposed): `gitnexus-web/src/core/ingestion/wikilink-processor.ts`
   - Signatures:
     - `export function buildWikilinkRelations(sourceId: string, links: Array<{ kind: 'code-ref' | 'node-ref'; raw: string }>, resolveNodeId: (labelOrPath: string) => string | null): GraphRelationship[];`
   - Integrate into pipeline orchestration after parsing/import processing (before process detection finalization).
   - Ensure UI edge visibility/filter configuration includes `REFERENCES` in expected views so generated edges are inspectable.
   - Grounding references:
     - `gitnexus-web/src/core/ingestion/pipeline.ts:89-125`
     - `gitnexus-web/src/core/ingestion/pipeline.ts:214-221`
     - `gitnexus-web/src/core/ingestion/pipeline.ts:271-279`

### Phase 4 — LLM “prose-justified wikilinks” contract

9. **Prompt rule addition** in `src/core/llm/agent.ts`
   - Extend existing grounding rules with:
     - “When using wikilinks, include brief rationale in prose around each link; avoid naked bullet-only link dumps.”
   - Keep citation format requirements intact.
   - Grounding reference:
     - `gitnexus-web/src/core/llm/agent.ts:51-70`

10. **Add output validator** (new module): `src/core/llm/wikilink-validator.ts`
   - Signatures:
     - `export interface WikilinkViolation { raw: string; line: number; reason: string; }`
     - `export function validateWikilinkContext(markdown: string): { valid: boolean; violations: WikilinkViolation[] };`
   - Hook validation on completed assistant turns (after stream completion) before final persist/export.
   - Start in warning mode; move to strict enforcement only after fixture calibration.

## Acceptance Criteria (testable)

1. Parser contract:
   - Given mixed prose with both file and node wikilinks, `tokenizeWikilinks()` returns ordered tokens preserving non-link text segments.
2. Backward compatibility:
   - Existing supported link forms (`[[file.ts]]`, `[[file.ts:10]]`, `[[file.ts:10-20]]`, `[[Type:Name]]`, `[[graph:Type:Name]]`) still render/click correctly.
3. Single-source parsing:
   - No duplicate regex grammar remains in:
     - `MarkdownRenderer.tsx`
     - `RightPanel.tsx`
     - `useAppState.tsx`
4. Node type coverage:
   - `[[Community:...]]` and `[[Process:...]]` parse as node refs and trigger click routing.
5. Navigation:
   - Clicking valid node-ref sets selected node state and invokes graph focus path (directly or via existing reference-focus flow).
6. Ingestion relations:
   - Wikilink-derived `REFERENCES` edges are generated when targets resolve; unresolved targets are skipped with non-fatal, rate-limited diagnostics.
   - `REFERENCES` edges are visible under expected edge filter/view settings.
7. LLM rule:
   - Validator flags markdown that contains bullet-only naked wikilinks without adjacent rationale text.
8. No regression:
   - Existing code-reference highlighting and panel behaviors remain functional.

## Test Plan (by file)

1. `gitnexus-web/src/core/wikilinks/__tests__/parser.test.ts`
   - `tokenizes prose and code-ref wikilinks in order`
   - `tokenizes node-ref with and without graph prefix`
   - `parses line ranges correctly`
   - `ignores malformed double-bracket fragments safely`

2. `gitnexus-web/src/components/__tests__/MarkdownRenderer.wikilinks.test.tsx`
   - `renders wikilinks as clickable anchors`
   - `emits onLinkClick for code-ref and node-ref`
   - `does not rewrite fenced code blocks`
   - `rejects unsafe schemes and preserves safe URL handling for non-custom links`

3. `gitnexus-web/src/components/__tests__/RightPanel.wikilink-routing.test.tsx`
   - `routes code-ref href to grounding handler`
   - `routes node-ref href to node grounding handler`
   - `node lookup uses fallback strategy when exact match fails`

4. `gitnexus-web/src/hooks/__tests__/useAppState.wikilinks.test.ts`
   - `streamed assistant text creates code references from parser tokens`
   - `dedupe semantics preserved`

5. `gitnexus-web/src/core/ingestion/__tests__/wikilink-processor.test.ts`
   - `creates REFERENCES relationship for resolved targets`
   - `skips unresolved targets`
   - `deduplicates repeated source-target relationships`

6. `gitnexus-web/src/core/llm/__tests__/wikilink-validator.test.ts`
   - `passes explanatory prose with embedded wikilinks`
   - `flags naked bullet-link output`
   - `returns stable line numbers in violations`

7. `gitnexus-web/src/core/graph/__tests__/types.references.test.ts`
   - `accepts REFERENCES in RelationshipType`
   - `legacy relationship types still compile/serialize`

## Risks and Mitigations

1. **Risk:** parser consolidation changes behavior subtly.
   - **Mitigation:** lock compatibility with golden tests for existing patterns before refactor.
2. **Risk:** node disambiguation introduces nondeterministic focus.
   - **Mitigation:** deterministic ranking (exact > case-insensitive > first stable sort) with test fixtures.
3. **Risk:** new `REFERENCES` edge increases graph density.
   - **Mitigation:** dedupe edges and optionally gate ingestion by feature flag/config.
4. **Risk:** prose validator over-flags concise valid responses.
   - **Mitigation:** begin in warning mode; tune rules with fixture corpus before strict enforcement.

## Verification Steps

1. Run unit tests for parser/render/routing/state/ingestion/llm validator suites.
2. Manually verify in UI:
   - Assistant message containing `[[src/file.ts:10-20]]` opens code panel and highlights expected range.
   - Assistant message containing `[[Function:runIngestionPipeline]]` selects/focuses node.
3. Validate graph data includes `REFERENCES` edges after ingestion where expected.
4. Confirm no regressions in existing citation rendering and export behavior.

## Execution Order

1. Parser module + tests
2. `MarkdownRenderer` migration + tests
3. `RightPanel` migration/routing improvements + tests
4. `useAppState` migration + tests
5. Relationship type + wikilink ingestion processor + tests
6. LLM prompt/validator + tests
7. End-to-end manual verification
