/**
 * LLM Prompt Templates for Wiki Generation
 * 
 * All prompts produce deterministic, source-grounded documentation.
 * Templates use {{PLACEHOLDER}} substitution.
 */

// ─── Grouping Prompt ──────────────────────────────────────────────────

export const GROUPING_SYSTEM_PROMPT = `You are a documentation architect. Given a list of source files with their exported symbols, group them into logical documentation modules.

Rules:
- Each module should represent a cohesive feature, layer, or domain
- Every file must appear in exactly one module
- Module names should be human-readable (e.g. "Authentication", "Database Layer", "API Routes")
- Aim for 5-15 modules for a typical project. Fewer for small projects, more for large ones
- Group by functionality, not by file type or directory structure alone
- Do NOT create modules for tests, configs, or non-source files`;

export const GROUPING_USER_PROMPT = `Group these source files into documentation modules.

**Files and their exports:**
{{FILE_LIST}}

**Directory structure:**
{{DIRECTORY_TREE}}

Respond with ONLY a JSON object mapping module names to file path arrays. No markdown, no explanation.
Example format:
{
  "Authentication": ["src/auth/login.ts", "src/auth/session.ts"],
  "Database": ["src/db/connection.ts", "src/db/models.ts"]
}`;

// ─── Leaf Module Prompt ───────────────────────────────────────────────

export const MODULE_SYSTEM_PROMPT = `You are a technical documentation writer. Write clear, developer-focused documentation for a code module.

Rules:
- Reference actual function names, class names, and code patterns — do NOT invent APIs
- Use the call graph and execution flow data for accuracy, but do NOT mechanically list every edge
- Frame content with typed node schema language:
  - **Concept:** architectural intent or design principle behind the module
  - **Pattern:** reusable approach that applies across modules (label with where it applies)
  - **Gotcha:** failure mode, edge case, or non-obvious coupling (label with severity: critical/warning/info)
- Weave wikilinks into explanatory prose sentences (e.g. "The [Parser](parser.md) normalizes inputs before [Validator](validator.md) rejects malformed payloads"), not as bare link lists
- Extract Gotchas from these structural signals in the call graph data:
  - High fan-in nodes (many callers → changing them breaks many consumers)
  - High fan-out nodes (many callees → complex orchestration, hard to test)
  - Cross-module process chains (flows that leave this module → coupling risk)
  - Functions that appear in many execution flows → hotspot nodes
- Include Mermaid diagrams only when they genuinely help understanding. Keep them small (5-10 nodes max)
- Structure the document however makes sense for this module — there is no mandatory format
- Write for a developer who needs to understand and contribute to this code`;

export const MODULE_USER_PROMPT = `Write documentation for the **{{MODULE_NAME}}** module.

## Source Code

{{SOURCE_CODE}}

## Call Graph & Execution Flows (reference for accuracy)

Internal calls: {{INTRA_CALLS}}
Outgoing calls: {{OUTGOING_CALLS}}
Incoming calls: {{INCOMING_CALLS}}
Execution flows: {{PROCESSES}}

---

Write comprehensive documentation for this module. Cover its purpose, how it works, its key components, and how it connects to the rest of the codebase.

Start with a **Concept** node: what architectural intent or design principle does this module embody? Then cover the implementation using whatever structure best fits. Label any reusable approaches as **Pattern** nodes and failure modes as **Gotcha** nodes (with severity). Weave links to related pages into explanatory sentences rather than standalone link lists. Include a Mermaid diagram only if it genuinely clarifies the architecture.`;

// ─── Parent Module Prompt ─────────────────────────────────────────────

export const PARENT_SYSTEM_PROMPT = `You are a technical documentation writer. Write a Map of Content (MOC) page for a module that contains sub-modules. Synthesize the children's documentation — do not re-read source code.

Rules:
- Structure this page as an MOC entry point: a navigable map of the cluster, not a summary dump
- Open with a one-paragraph orientation: what this cluster owns, its primary responsibility boundary
- For each sub-module, write a prose paragraph (not a bullet) that explains its role and links to it naturally in the sentence
- Identify 1-3 cross-cutting patterns that span multiple sub-modules and label them explicitly as **Pattern:** nodes
- Surface 1-3 gotchas (failure modes, common mistakes, non-obvious coupling) and label them as **Gotcha:** nodes
- Include 2-4 open questions that would guide deeper exploration or future hardening
- Reference actual components from the child modules — do NOT generalize
- Include a Mermaid diagram only if it genuinely clarifies how the sub-modules relate
- Keep it concise — the reader can click through to child pages for detail`;

export const PARENT_USER_PROMPT = `Write documentation for the **{{MODULE_NAME}}** module, which contains these sub-modules:

{{CHILDREN_DOCS}}

Cross-module calls: {{CROSS_MODULE_CALLS}}
Shared execution flows: {{CROSS_PROCESSES}}

---

Write an MOC-style entry point for this cluster. Structure it as:
1. **Orientation** — one paragraph on what this cluster owns and its responsibility boundary
2. **Sub-module map** — prose paragraphs (not bullets) for each child, with wikilinks woven into sentences
3. **Concept** — extract the architectural intent: what design principle or domain concept unifies these sub-modules? Label it explicitly as a Concept node
4. **Patterns** — identify 1-3 cross-cutting patterns and label each as a Pattern node
5. **Gotchas** — surface failure modes from the cross-module call edges and shared flows. Label each as a Gotcha node
6. **Open questions** — 2-4 questions to guide deeper investigation

Use whatever additional structure fits best. Link to sub-module pages in explanatory prose rather than listing bare links.`;

// ─── Overview Prompt ──────────────────────────────────────────────────

export const OVERVIEW_SYSTEM_PROMPT = `You are a technical documentation writer. Write the top-level overview page for a repository wiki. This is the first page a new developer sees.

Rules:
- Be clear and welcoming — this is the entry point to the entire codebase
- Reference actual module names so readers can navigate to their docs
- Include a high-level Mermaid architecture diagram showing only the most important modules and their relationships (max 10 nodes). A new dev should grasp it in 10 seconds
- Do NOT create module index tables or list every module with descriptions — just link to module pages naturally within the text
- Use the inter-module edges and execution flow data for accuracy, but do NOT dump them raw`;

export const OVERVIEW_USER_PROMPT = `Write the overview page for this repository's wiki.

## Project Info

{{PROJECT_INFO}}

## Module Summaries

{{MODULE_SUMMARIES}}

## Reference Data (for accuracy — do not reproduce verbatim)

Inter-module call edges: {{MODULE_EDGES}}
Key system flows: {{TOP_PROCESSES}}

---

Write a clear overview of this project: what it does, how it's architected, and the key end-to-end flows. Include a simple Mermaid architecture diagram (max 10 nodes, big-picture only). Link to module pages (e.g. \`[Module Name](module-slug.md)\`) naturally in the text rather than listing them in a table. If project config was provided, include brief setup instructions. Structure the page however reads best.`;

// ─── Template Substitution Helper ─────────────────────────────────────

/**
 * Replace {{PLACEHOLDER}} tokens in a template string.
 */
export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// ─── Formatting Helpers ───────────────────────────────────────────────

/**
 * Format file list with exports for the grouping prompt.
 */
export function formatFileListForGrouping(
  files: Array<{ filePath: string; symbols: Array<{ name: string; type: string }> }>,
): string {
  return files
    .map(f => {
      const exports = f.symbols.length > 0
        ? f.symbols.map(s => `${s.name} (${s.type})`).join(', ')
        : 'no exports';
      return `- ${f.filePath}: ${exports}`;
    })
    .join('\n');
}

/**
 * Build a directory tree string from file paths.
 */
export function formatDirectoryTree(filePaths: string[]): string {
  const dirs = new Set<string>();
  for (const fp of filePaths) {
    const parts = fp.replace(/\\/g, '/').split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }

  const sorted = Array.from(dirs).sort();
  if (sorted.length === 0) return '(flat structure)';

  return sorted.slice(0, 50).join('\n') + (sorted.length > 50 ? `\n... and ${sorted.length - 50} more directories` : '');
}

/**
 * Format call edges as readable text.
 */
export function formatCallEdges(
  edges: Array<{ fromFile: string; fromName: string; toFile: string; toName: string }>,
): string {
  if (edges.length === 0) return 'None';
  return edges
    .slice(0, 30)
    .map(e => `${e.fromName} (${shortPath(e.fromFile)}) → ${e.toName} (${shortPath(e.toFile)})`)
    .join('\n');
}

/**
 * Format process traces as readable text.
 */
export function formatProcesses(
  processes: Array<{
    label: string;
    type: string;
    description?: string;
    steps: Array<{ step: number; name: string; filePath: string }>;
  }>,
): string {
  if (processes.length === 0) return 'No execution flows detected for this module.';

  return processes
    .map(p => {
      const desc = p.description ? `\n  Summary: ${p.description}` : '';
      const stepsText = p.steps
        .map(s => `  ${s.step}. ${s.name} (${shortPath(s.filePath)})`)
        .join('\n');
      return `**${p.label}** (${p.type}):${desc}\n${stepsText}`;
    })
    .join('\n\n');
}

/**
 * Shorten a file path for readability.
 */
function shortPath(fp: string): string {
  const parts = fp.replace(/\\/g, '/').split('/');
  return parts.length > 3 ? parts.slice(-3).join('/') : fp;
}
