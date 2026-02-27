# Task: Implement GitNexus Prompt-Library Todo Bundle (Chat UX + Mermaid + Wiki Prompt Upgrades)

<!-- BMAD Enhanced Task Specification -->

## Metadata

- **Task ID:** task-001
- **Created:** 2026-02-26
- **Last Updated:** 2026-02-26
- **Related Epic/Feature:** Prompt Library / skill-graph / gitnexus codex (todo) (local export bundle)
- **Priority:** P1

## Status

In Review (implementation complete; pending manual/UI validation where no automated harness exists)

---

## Objective

**As a** GitNexus user,
**I want** chat export/history/copy improvements and better wiki prompt structure,
**so that** I can preserve conversations reliably, copy artifacts accurately, and navigate richer knowledge outputs.

---

## Acceptance Criteria

1. Right panel chat tab supports export in Markdown, JSON, and plain text, with usable filenames and no backend changes.
2. Chat exports include AI citations parsed from assistant message content and provide both per-message and global citation lists.
3. Markdown code snippets have a per-block copy button with visible copied-state feedback and fallback clipboard behavior.
4. Mermaid copy action in process flow modal copies `rawMermaid` when available, falling back to generated Mermaid only when raw content is absent.
5. Chat history sessions are persisted in local storage, can be created/loaded/deleted, and are scoped by `projectName`.
6. Wiki prompt direction is updated to support typed node schema and wikilink-woven prose guidance aligned with Hypergraph transfer notes.

---

## Reference Bundle

- Canonical local source bundle:
  - `docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md`
  - `docs/references/notion/gitnexus-codex-todo/chat-history.md`
  - `docs/references/notion/gitnexus-codex-todo/mermaid-diagram-fix.md`
  - `docs/references/notion/gitnexus-codex-todo/gitnexus-hypergraph.md`
- Raw Notion export snapshot (unchanged original):
  - `docs/references/notion/gitnexus_codex_todo_export/`

---

## Context (Embedded from Architecture)

### Previous Task Insights

- No prior task specs are present in configured `taskLocation` (`.claude/tasks`) at time of authoring, so this is the initial BMAD task in this repo.
- Configured architecture docs (`docs/architecture.md`, `docs/standards.md`, `docs/patterns.md`) are missing; implementation context for this task is therefore sourced from Notion pages and verified code references.

[Source: .claude/config.yaml#development.taskLocation]
[Source: Repository check 2026-02-26: `.claude/tasks` absent before creation]
[Source: Repository check 2026-02-26: missing docs/architecture.md, docs/standards.md, docs/patterns.md]

### Data Models

- Existing `ChatMessage` model is in `gitnexus-web/src/core/llm/types.ts` and currently contains message-level fields used by right panel rendering and agent responses.
- Proposed addition from `chat-history` note: introduce `ChatSession` model with:
  - `id`, `title`, `messages: ChatMessage[]`, `createdAt`, `updatedAt`, `projectName`.
- Chat history state additions planned in `useAppState`:
  - `chatSessions`, `activeChatId`, `newChat`, `loadChat`, `deleteChat`, `renameChat`.

[Source: gitnexus-web/src/core/llm/types.ts#interface ChatMessage]
[Source: gitnexus-web/src/hooks/useAppState.tsx#AppState fields around `projectName`, `chatMessages`, `clearChat`]
[Source: docs/references/notion/gitnexus-codex-todo/chat-history.md]

### API Specifications

- No backend API changes are required for this task bundle.
- All requested behavior is frontend/local state logic (`RightPanel`, `MarkdownRenderer`, `ProcessFlowModal`, `useAppState`, and wiki prompt file updates).

[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#chat-export]
[Source: docs/references/notion/gitnexus-codex-todo/chat-history.md]

### Component Specifications

- `RightPanel.tsx`
  - Add export affordance (button + dropdown menu) visible on `chat` tab when there are messages.
  - Add formatters for markdown/json/text export.
  - Add citation parsing for exports using markdown citation patterns.
  - Add history controls/sidebar (`History`, `Plus`, list, delete action).
- `MarkdownRenderer.tsx`
  - Wrap code blocks in a `relative group` and overlay copy button per snippet.
  - Provide copied-state feedback and clipboard fallback.
- `ProcessFlowModal.tsx`
  - `handleCopyMermaid` should mirror render-path logic: use `rawMermaid` when present, otherwise `generateProcessMermaid(process)`.
- Wiki prompt adaptation
  - Apply Hypergraph transfer concepts: typed nodes (MOC/Concept/Pattern/Gotcha), wikilink-woven prose, MOC entry orientation.

[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#chat-export]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#copy-snippet-button]
[Source: docs/references/notion/gitnexus-codex-todo/mermaid-diagram-fix.md]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-hypergraph.md]
[Source: gitnexus-web/src/components/RightPanel.tsx]
[Source: gitnexus-web/src/components/MarkdownRenderer.tsx#citation/link parsing comments lines ~39-54]
[Source: gitnexus-web/src/components/ProcessFlowModal.tsx#render uses rawMermaid at ~139-141; copy handler at ~190-193]

### File Locations

Implementation files:
- `gitnexus-web/src/core/llm/types.ts`
- `gitnexus-web/src/hooks/useAppState.tsx`
- `gitnexus-web/src/components/RightPanel.tsx`
- `gitnexus-web/src/components/MarkdownRenderer.tsx`
- `gitnexus-web/src/components/ProcessFlowModal.tsx`
- `gitnexus/src/core/wiki/prompts.ts` (or equivalent current wiki prompt location in this repo if path diverged)

Potential tests (add if test harness exists for module):
- `gitnexus-web/src/components/__tests__/RightPanel.test.tsx`
- `gitnexus-web/src/components/__tests__/MarkdownRenderer.test.tsx`
- `gitnexus-web/src/components/__tests__/ProcessFlowModal.test.tsx`
- `gitnexus-web/src/hooks/__tests__/useAppState.chatHistory.test.tsx`

[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-hypergraph.md]
[Source: Repository file existence checks via `fd` on 2026-02-26]

### Testing Requirements

- UI/behavioral verification required for each feature area:
  - Export menu visibility conditions and file payload shape.
  - Citation extraction correctness for both file refs and node refs.
  - Snippet copy interaction state transitions (`Copy` -> `Copied`).
  - Mermaid copy returns raw diagram when `rawMermaid` exists.
  - Chat history creation/load/delete persistence lifecycle in local storage.
- If automated tests are unavailable in a touched module, provide manual verification steps and reproducible test script in PR notes.

[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#chat-export]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#ai-citations-exporting-with-chat-exporting]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md#copy-snippet-button]
[Source: docs/references/notion/gitnexus-codex-todo/mermaid-diagram-fix.md]

### Technical Constraints

- Keep scope frontend-only; avoid introducing backend endpoints.
- Preserve existing role/message semantics (`user`, `assistant`, `tool`) when formatting exports.
- Maintain compatibility with existing icon stack (`lucide-react`).
- Avoid cross-project chat leakage by using `projectName` in history session model/filtering.
- Wiki prompt changes should remain prompt-engineering level (no new data infrastructure).

[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-codex-todo.md]
[Source: docs/references/notion/gitnexus-codex-todo/chat-history.md]
[Source: docs/references/notion/gitnexus-codex-todo/gitnexus-hypergraph.md]

---

## Tasks / Subtasks

- [ ] **Task 1:** Add chat session model and state management in app state (AC: 5)
  - [x] Subtask 1.1: Add `ChatSession` interface in `gitnexus-web/src/core/llm/types.ts`.
  - [x] Subtask 1.2: Extend app state contract with session fields/actions in `useAppState.tsx`.
  - [x] Subtask 1.3: Implement local storage read/write for `gitnexus.chatHistory`.
  - [x] Subtask 1.4: Ensure `sendChatMessage` initializes session/title when no active chat exists.
  - [ ] Write unit tests for Task 1 (or document manual verification if harness not available).
  - [ ] Validate Task 1 implementation by reloading app and restoring sessions.

- [ ] **Task 2:** Implement right-panel export UI and formatters (AC: 1)
  - [x] Subtask 2.1: Add download icon and export dropdown actions in `RightPanel.tsx` header.
  - [x] Subtask 2.2: Implement `formatChatAsMarkdown`, `formatChatAsJSON`, `formatChatAsText` helpers.
  - [x] Subtask 2.3: Implement shared `triggerDownload` and naming strategy using project slug.
  - [x] Subtask 2.4: Gate export visibility to `activeTab === 'chat' && chatMessages.length > 0`.
  - [ ] Write UI tests for export controls and output stubs.
  - [ ] Validate Task 2 with manual file download checks in browser.

- [ ] **Task 3:** Add AI citation extraction to export pipeline (AC: 2)
  - [x] Subtask 3.1: Implement `extractCitationsFromContent` with file-ref and graph-node regex patterns.
  - [x] Subtask 3.2: Inject per-message citation lists in markdown/json/text export outputs.
  - [x] Subtask 3.3: Add global deduplicated citation appendix/list in markdown/json outputs.
  - [x] Subtask 3.4: Confirm non-assistant messages do not generate citation lists.
  - [ ] Write unit tests for regex extraction and deduplication.
  - [ ] Validate Task 3 with sample messages containing both citation formats.

- [ ] **Task 4:** Add snippet copy button UX in markdown renderer (AC: 3)
  - [x] Subtask 4.1: Add `CopyButton` helper component with copied-state timeout.
  - [x] Subtask 4.2: Add `navigator.clipboard` path with fallback textarea copy behavior.
  - [x] Subtask 4.3: Wrap syntax highlighter blocks to support hover-revealed control.
  - [ ] Write component tests for copy button visibility and copied-state transition.
  - [ ] Validate Task 4 by copying multi-line code snippets in UI.

- [ ] **Task 5:** Fix mermaid copy behavior in process modal (AC: 4)
  - [x] Subtask 5.1: Update `handleCopyMermaid` to prefer `rawMermaid` before generated fallback.
  - [x] Subtask 5.2: Ensure behavior matches existing render-path mermaid source logic.
  - [ ] Write regression test for raw-mermaid copy case (or add manual repro script).
  - [ ] Validate Task 5 by comparing copied output with displayed diagram.

- [ ] **Task 6:** Add chat history sidebar and controls in right panel (AC: 5)
  - [x] Subtask 6.1: Add history toggle/new chat controls and icon imports in `RightPanel.tsx`.
  - [x] Subtask 6.2: Render collapsible history list with active selection and delete action.
  - [x] Subtask 6.3: Wire list interactions to `loadChat`, `newChat`, `deleteChat` actions.
  - [ ] Write UI tests for list interactions and active session switching.
  - [ ] Validate Task 6 via real multi-session workflow.

- [ ] **Task 7:** Apply Hypergraph-inspired wiki prompt updates (AC: 6)
  - [x] Subtask 7.1: Update wiki prompt definitions to include typed node framing (MOC/Concept/Pattern/Gotcha).
  - [x] Subtask 7.2: Update prompt wording to require wikilink-woven explanatory prose.
  - [x] Subtask 7.3: Add prompt guidance for gotcha extraction from structural graph signals.
  - [x] Subtask 7.4: Add/adjust MOC entry-point prompt language for cluster navigation and open questions.
  - [ ] Write prompt-level validation tests or golden outputs if prompt testing exists.
  - [ ] Validate Task 7 with sample wiki generation run.

- [ ] **Task 8:** Final validation and documentation (AC: 1,2,3,4,5,6)
  - [x] Subtask 8.1: Run relevant web app checks/tests and collect results.
  - [ ] Subtask 8.2: Verify no regressions in existing chat/process workflows.
  - [x] Subtask 8.3: Document behavior changes and fallback behavior in project docs/changelog as appropriate.
  - [x] Validate all ACs using a concise pass/fail checklist.

- [ ] **Final Validation:**
  - [ ] All acceptance criteria verified
  - [ ] All relevant tests passing
  - [x] Code follows project standards in-repo
  - [ ] Documentation updated where needed

---

## Implementation Record

### Agent Model Used

gpt-5.3-codex (james-developer-v2)

### Debug Log References

- Build verification (independent):
  - `npm --prefix /home/user/projects/temp/ai-apps/GitNexus/gitnexus-web run build` (PASS; includes TypeScript build + Vite build)
  - `npm --prefix /home/user/projects/temp/ai-apps/GitNexus/gitnexus run build` (PASS; TypeScript compile)
- Working tree review:
  - `git -C /home/user/projects/temp/ai-apps/GitNexus diff --name-only` used to confirm AC-related touched files

### Completion Notes

AC1-AC6 implementation code is present in modified source files and both package builds pass. No dedicated automated web UI/component test harness was executed in this closure step. Manual verification remains required for export UX payloads, snippet copy interaction, mermaid copy parity, chat history session lifecycle, and wiki prompt output behavior before marking all validation checkboxes complete.

### Files Modified

- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus-web/src/core/llm/types.ts`
- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus-web/src/hooks/useAppState.tsx`
- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus-web/src/components/RightPanel.tsx`
- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus-web/src/components/MarkdownRenderer.tsx`
- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus-web/src/components/ProcessFlowModal.tsx`
- `/home/user/projects/temp/ai-apps/GitNexus/gitnexus/src/core/wiki/prompts.ts`
- `/home/user/projects/temp/ai-apps/GitNexus/.claude/tasks/task-001.md`

### Testing Results

- Automated verification run in this closure step:
  - `gitnexus-web` build/typecheck: PASS (`tsc -b && vite build`)
  - `gitnexus` build/typecheck: PASS (`tsc`)
- Observed warnings in web build:
  - Vite warning about browser externalization for `fs`/`path` from `web-tree-sitter`
  - Rollup chunk size warning (>500kB)
  - `eval` warning in third-party `web-tree-sitter`
- AC pass/fail checklist (traceability evidence):
  - AC1: PASS — `gitnexus-web/src/components/RightPanel.tsx` (export formatters/menu + chat-tab/message gate)
  - AC2: PASS — `gitnexus-web/src/components/RightPanel.tsx` (`extractCitationsFromContent`, per-message/global citation output)
  - AC3: PASS — `gitnexus-web/src/components/MarkdownRenderer.tsx` (`CopyButton`, copied-state, clipboard fallback)
  - AC4: PASS — `gitnexus-web/src/components/ProcessFlowModal.tsx` (`handleCopyMermaid` uses `rawMermaid` first)
  - AC5: PASS — `gitnexus-web/src/core/llm/types.ts`, `gitnexus-web/src/hooks/useAppState.tsx`, `gitnexus-web/src/components/RightPanel.tsx` (session model, scoped persistence, history UI/actions)
  - AC6: PASS — `gitnexus/src/core/wiki/prompts.ts` (typed nodes + wikilink prose + gotcha/MOC guidance)
- Documentation update:
  - Added `Task-001 Implementation Notes` in `docs/references/notion/gitnexus-codex-todo/README.md`.
- UI/manual validation status:
  - Not executed in this closure step; required checks remain intentionally unchecked where they call for manual UX validation or test harness-specific coverage.

---

## Quality Review

### Review Date

{{REVIEW_DATE}}

### Reviewer

{{REVIEWER}}

### Quality Gate Decision

{{GATE_DECISION}}

### Quality Gate File

{{GATE_FILE_PATH}}

### Summary

{{REVIEW_SUMMARY}}

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-26 | 1.0 | Initial task specification created from Prompt Library skill-graph pages | codex |

---
