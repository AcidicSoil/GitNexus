# mermaid diagram fix

## **🐛 Root Cause**

The bug is in **`ProcessFlowModal.tsx` line 190–193** — the **`handleCopyMermaid`** function **ignores `rawMermaid`** and always calls **`generateProcessMermaid(process)`** instead.

![image.png](mermaid%20diagram%20fix/image.png)

## **✅ The Fix**

**File:** **`gitnexus-web/src/components/ProcessFlowModal.tsx`**

**Line 190–193** — mirror the same **`rawMermaid`**-first logic used in the render path:

```markdown
 // Copy mermaid code to clipboard
  const handleCopyMermaid = useCallback(async () => {
    if (!process) return;
-   const mermaidCode = generateProcessMermaid(process);
+   const mermaidCode = (process as any).rawMermaid
+     ? (process as any).rawMermaid
+     : generateProcessMermaid(process);
    await navigator.clipboard.writeText(mermaidCode);
  }, [process]);
```

This is a

**one-liner fix**

— the render path at

gitnexus-web/src/components/ProcessFlowModal.tsx:139-141

already has the correct pattern, the copy handler just forgot to use it.

**TL;DR:** The **`handleCopyMermaid`** function in **`ProcessFlowModal.tsx:192`** always calls **`generateProcessMermaid()`** which returns **`graph TD\n A[No steps found]`** for AI-generated diagrams (because **`steps: []`**). Fix: add the same **`rawMermaid`**-first check that the render path already uses at line 139-141.