# GitNexus Codex Todo Notion Export Reference

This folder is the normalized, stable reference copy of the Notion export for:
- `skill-graph` -> `gitnexus codex (todo)` and subpages

## Canonical Files

- `gitnexus-codex-todo.md` - Root page content (`gitnexus codex (todo)`)
- `chat-history.md` - Subpage: chat history notes
- `mermaid-diagram-fix.md` - Subpage: mermaid copy bug + fix
- `gitnexus-hypergraph.md` - Subpage: hypergraph transfer notes

## Assets

- `assets/` contains copied images and original-export markdown/assets with original names.

## Raw Snapshot

The untouched raw export bundle is preserved at:

- `docs/references/notion/gitnexus_codex_todo_export/`

## Task-001 Implementation Notes

The following behavior updates were implemented from this reference bundle:

- Chat export in Markdown/JSON/Text with citation-aware formatting in `gitnexus-web/src/components/RightPanel.tsx`
- Code-block copy button with copied-state + clipboard fallback in `gitnexus-web/src/components/MarkdownRenderer.tsx`
- Mermaid copy fallback fix (`rawMermaid` preferred over generated output) in `gitnexus-web/src/components/ProcessFlowModal.tsx`
- Chat session persistence scoped by project name in `gitnexus-web/src/hooks/useAppState.tsx`
- Wiki prompt guidance upgrades (typed node framing + wikilink-woven prose + gotcha/MOC guidance) in `gitnexus/src/core/wiki/prompts.ts`

