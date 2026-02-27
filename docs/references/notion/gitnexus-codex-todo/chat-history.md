# chat-history

![image.png](chat-history/image.png)

```markdown
Step 1 — Add ChatSession type 
gitnexus-web/src/core/llm/types.ts:1
Add after the existing ChatMessage interface 
gitnexus-web/src/core/llm/types.ts:175-190
:
```

```markdown
// gitnexus-web/src/core/llm/types.ts

export interface ChatSession {
  id: string;
  title: string;           // auto-generated from first user message
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  projectName: string;     // ties session to a repo
}
```

### **Step 2 — Extend `AppState` interface + `AppStateProvider` gitnexus-web/src/hooks/useAppState.tsx:53-170**

**Add to `AppState` interface** (after the existing **`clearChat`** line gitnexus-web/src/hooks/useAppState.tsx:153):

```markdown
// Chat History
chatSessions: ChatSession[];
activeChatId: string | null;
newChat: () => void;
loadChat: (id: string) => void;
deleteChat: (id: string) => void;
renameChat: (id: string, title: string) => void;
```

**Add to `AppStateProvider`** (near the existing chat state, around line 686+):

```markdown
// ── Chat History (localStorage) ──────────────────────────────────────────
const HISTORY_KEY = 'gitnexus.chatHistory';

const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveSessionsToStorage = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
  } catch { /* quota exceeded — silently ignore */ }
};

const [chatSessions, setChatSessions] = useState<ChatSession[]>(loadSessionsFromStorage);
const [activeChatId, setActiveChatId] = useState<string | null>(null);

// Auto-save current chatMessages into the active session whenever they change
useEffect(() => {
  if (!activeChatId || chatMessages.length === 0) return;
  setChatSessions(prev => {
    const updated = prev.map(s =>
      s.id === activeChatId
        ? { ...s, messages: chatMessages, updatedAt: Date.now() }
        : s
    );
    saveSessionsToStorage(updated);
    return updated;
  });
}, [chatMessages, activeChatId]);

const newChat = useCallback(() => {
  const id = `chat-${Date.now()}`;
  const session: ChatSession = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectName,
  };
  setChatSessions(prev => {
    const updated = [session, ...prev];
    saveSessionsToStorage(updated);
    return updated;
  });
  setActiveChatId(id);
  clearChat(); // resets chatMessages in existing agent state
}, [projectName, clearChat]);

const loadChat = useCallback((id: string) => {
  const session = chatSessions.find(s => s.id === id);
  if (!session) return;
  setActiveChatId(id);
  // Restore messages into the live chat state
  setChatMessages(session.messages);  // expose setChatMessages or use a new action
}, [chatSessions]);

const deleteChat = useCallback((id: string) => {
  setChatSessions(prev => {
    const updated = prev.filter(s => s.id !== id);
    saveSessionsToStorage(updated);
    return updated;
  });
  if (activeChatId === id) {
    setActiveChatId(null);
    clearChat();
  }
}, [activeChatId, clearChat]);

const renameChat = useCallback((id: string, title: string) => {
  setChatSessions(prev => {
    const updated = prev.map(s => s.id === id ? { ...s, title } : s);
    saveSessionsToStorage(updated);
    return updated;
  });
}, []);
```

**Key wiring**: When **`sendChatMessage`** is called and **`activeChatId`** is **`null`**, auto-create a new session and set its title from the first user message:

```markdown
// Patch inside sendChatMessage (around line 686+):
if (!activeChatId) {
  const id = `chat-${Date.now()}`;
  const title = message.slice(0, 60) + (message.length > 60 ? '…' : '');
  const session: ChatSession = { id, title, messages: [], createdAt: Date.now(), updatedAt: Date.now(), projectName };
  setChatSessions(prev => { const u = [session, ...prev]; saveSessionsToStorage(u); return u; });
  setActiveChatId(id);
}
```

### **Step 3 — Update `RightPanel.tsx` UI gitnexus-web/src/components/RightPanel.tsx:1**

Add a collapsible history sidebar to the chat tab. Pull new state from **`useAppState`**:

```markdown
const {
  // ... existing ...
  chatSessions, activeChatId, newChat, loadChat, deleteChat, renameChat,
} = useAppState();

const [showHistory, setShowHistory] = useState(false);
Header button (next to the existing clear button):

<button onClick={() => setShowHistory(h => !h)} title="Chat History">
  <History className="w-4 h-4" />
</button>
<button onClick={newChat} title="New Chat">
  <Plus className="w-4 h-4" />
</button>
```

**History sidebar** (rendered inside the chat tab, left of messages):

```markdown
{showHistory && (
  <div className="w-56 border-r border-border-subtle flex flex-col bg-surface overflow-y-auto">
    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
      Chat History
    </div>
    {chatSessions.length === 0 && (
      <p className="px-3 py-2 text-xs text-text-muted">No saved chats yet.</p>
    )}
    {chatSessions.map(session => (
      <div
        key={session.id}
        onClick={() => loadChat(session.id)}
        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-hover text-sm truncate
          ${activeChatId === session.id ? 'bg-accent/10 text-accent' : 'text-text-primary'}`}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 truncate">{session.title}</span>
        <button
          onClick={e => { e.stopPropagation(); deleteChat(session.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    ))}
  </div>
)}
```

### **Lucide Icons needed (already in package)**

Add to **`RightPanel.tsx`** imports: **`History`**, **`Plus`**, **`MessageSquare`**, **`Trash2`**

### **TL;DR**

**3 files to change:**

1. **`types.ts`** — add **`ChatSession`** interface (6 lines)
2. **`useAppState.tsx`** — add **`chatSessions`**, **`activeChatId`**, **`newChat`**, **`loadChat`**, **`deleteChat`**, **`renameChat`** state + auto-save **`useEffect`** that writes to **`localStorage`** key **`gitnexus.chatHistory`** whenever **`chatMessages`** changes
3. **`RightPanel.tsx`** — add **`History`**/**`Plus`** buttons in header + collapsible left sidebar listing sessions with delete; clicking a session calls **`loadChat()`** which restores **`chatMessages`** so the agent retains full conversation context

Sessions are **auto-titled** from the first user message, **auto-saved** on every message update, and **scoped to `projectName`** so different repos don't mix histories. No backend needed — pure **`localStorage`**.