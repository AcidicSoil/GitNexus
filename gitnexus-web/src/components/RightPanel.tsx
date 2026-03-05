import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Square, Sparkles, User,
  PanelRightClose, Loader2, AlertTriangle, GitBranch,
  Download, ChevronDown, History, Plus, Trash2, FileText, Braces, Type
} from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import type { ChatMessage } from '../core/llm/types';
import { ToolCallCard } from './ToolCallCard';
import { isProviderConfigured } from '../core/llm/settings-service';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ProcessesPanel } from './ProcessesPanel';
import { extractWikilinks, tokenizeWikilinks } from '../core/wikilinks/parser';
export const RightPanel = () => {
  const {
    isRightPanelOpen,
    setRightPanelOpen,
    fileContents,
    graph,
    addCodeReference,
    // LLM / chat state
    projectName,
    chatMessages,
    chatSessions,
    activeChatId,
    isChatLoading,
    agentError,
    isAgentReady,
    isAgentInitializing,
    sendChatMessage,
    stopChatResponse,
    clearChat,
    newChat,
    loadChat,
    deleteChat,
    rightPanelWidth,
    setRightPanelWidth,
    setSelectedNode,
    openCodePanel,
  } = useAppState();

  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'processes'>('chat');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Auto-scroll to bottom when messages update or while streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const resolveFilePathForUI = useCallback((requestedPath: string): string | null => {
    const req = requestedPath.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
    if (!req) return null;

    // Exact match first (case-insensitive)
    for (const key of fileContents.keys()) {
      const norm = key.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
      if (norm === req) return key;
    }

    // Ends-with match (best for partial paths)
    let best: { path: string; score: number } | null = null;
    for (const key of fileContents.keys()) {
      const norm = key.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
      if (norm.endsWith(req)) {
        const score = 1000 - norm.length;
        if (!best || score > best.score) best = { path: key, score };
      }
    }
    return best?.path ?? null;
  }, [fileContents]);

  const findFileNodeIdForUI = useCallback((filePath: string): string | undefined => {
    if (!graph) return undefined;
    const target = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
    const node = graph.nodes.find(
      (n) => n.label === 'File' && n.properties.filePath.replace(/\\/g, '/').replace(/^\.?\//, '') === target
    );
    return node?.id;
  }, [graph]);

  const handleGroundingClick = useCallback((inner: string) => {
    const raw = inner.trim();
    if (!raw) return;

    const token = tokenizeWikilinks(`[[${raw}]]`).find((t) => t.type === 'code-ref');
    if (!token || token.type !== 'code-ref') return;

    const resolvedPath = resolveFilePathForUI(token.path);
    if (!resolvedPath) return;

    const startLine0 = token.startLine !== undefined ? Math.max(0, token.startLine - 1) : undefined;
    const endLine0 = token.endLine !== undefined ? Math.max(0, token.endLine - 1) : startLine0;
    const nodeId = findFileNodeIdForUI(resolvedPath);

    addCodeReference({
      filePath: resolvedPath,
      startLine: startLine0,
      endLine: endLine0,
      nodeId,
      label: 'File',
      name: resolvedPath.split('/').pop() ?? resolvedPath,
      source: 'ai',
    });
  }, [addCodeReference, findFileNodeIdForUI, resolveFilePathForUI]);

  // Handler for node grounding: [[Class:View]], [[Function:trigger]], [[Community:...]], [[Process:...]], etc.
  const handleNodeGroundingClick = useCallback((nodeTypeAndName: string) => {
    const raw = nodeTypeAndName.trim();
    if (!raw || !graph) return;

    const token = tokenizeWikilinks(`[[${raw}]]`).find((t) => t.type === 'node-ref');
    if (!token || token.type !== 'node-ref') return;

    const { nodeType, nodeName } = token;
    const exactMatches = graph.nodes.filter((n) =>
      n.label === nodeType && n.properties.name === nodeName
    );
    const ciMatches = exactMatches.length === 0
      ? graph.nodes.filter((n) =>
          n.label === nodeType && n.properties.name.toLowerCase() === nodeName.toLowerCase()
        )
      : [];

    const candidates = (exactMatches.length > 0 ? exactMatches : ciMatches)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    const node = candidates[0];
    if (!node) {
      console.warn(`Node not found: ${nodeType}:${nodeName}`);
      return;
    }

    setSelectedNode(node);
    openCodePanel();

    if (node.properties.filePath) {
      const resolvedPath = resolveFilePathForUI(node.properties.filePath);
      if (resolvedPath) {
        addCodeReference({
          filePath: resolvedPath,
          startLine: node.properties.startLine ? node.properties.startLine - 1 : undefined,
          endLine: node.properties.endLine ? node.properties.endLine - 1 : undefined,
          nodeId: node.id,
          label: node.label,
          name: node.properties.name,
          source: 'ai',
        });
      }
    }
  }, [graph, setSelectedNode, openCodePanel, resolveFilePathForUI, addCodeReference]);

  const handleLinkClick = useCallback((href: string) => {
    if (href.startsWith('code-ref:')) {
      const inner = decodeURIComponent(href.slice('code-ref:'.length));
      handleGroundingClick(inner);
    } else if (href.startsWith('node-ref:')) {
      const inner = decodeURIComponent(href.slice('node-ref:'.length));
      handleNodeGroundingClick(inner);
    }
  }, [handleGroundingClick, handleNodeGroundingClick]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const delta = resizeState.startX - event.clientX;
    setRightPanelWidth(resizeState.startWidth + delta);
  }, [setRightPanelWidth]);

  const handlePointerUp = useCallback(() => {
    resizeStateRef.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  }, [handlePointerMove]);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: rightPanelWidth,
    };
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [rightPanelWidth, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Auto-resize textarea as user types
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    // Set to scrollHeight, capped at max
    const maxHeight = 160; // ~6 lines
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    // Show scrollbar if content exceeds max
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [chatInput, adjustTextareaHeight]);

  // Chat handlers
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
      textareaRef.current.style.overflowY = 'hidden';
    }
    await sendChatMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const chatSuggestions = [
    'Explain the project architecture',
    'What does this project do?',
    'Show me the most important files',
    'Find all API handlers',
  ];

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const projectSlug = useMemo(() => {
    const base = (projectName || 'project').trim().toLowerCase();
    return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  }, [projectName]);

  const extractCitationsFromContent = useCallback((content: string): string[] => {
    const citations = new Set<string>();
    for (const ref of extractWikilinks(content)) {
      if (ref.kind === 'code-ref') citations.add(`file:${ref.raw}`);
      if (ref.kind === 'node-ref') {
        const parts = ref.raw.split(':');
        const nodeType = parts[0];
        const nodeName = parts.slice(1).join(':');
        citations.add(`node:${nodeType}:${nodeName}`);
      }
    }
    return Array.from(citations);
  }, []);

  const getCitationsForMessage = useCallback((message: ChatMessage): string[] => {
    if (message.role !== 'assistant') return [];
    return extractCitationsFromContent(message.content || '');
  }, [extractCitationsFromContent]);

  const allCitations = useMemo(() => {
    const unique = new Set<string>();
    chatMessages.forEach((message) => {
      getCitationsForMessage(message).forEach((citation) => unique.add(citation));
    });
    return Array.from(unique);
  }, [chatMessages, getCitationsForMessage]);

  const triggerDownload = useCallback((filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const buildExportFilename = useCallback((extension: 'md' | 'json' | 'txt') => {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `${projectSlug}-chat-${stamp}.${extension}`;
  }, [projectSlug]);

  const formatChatAsMarkdown = useCallback(() => {
    const lines: string[] = [
      `# Chat Export (${projectName || 'project'})`,
      '',
      `Exported: ${new Date().toISOString()}`,
      '',
    ];

    chatMessages.forEach((message) => {
      lines.push(`## ${message.role.toUpperCase()} · ${new Date(message.timestamp).toISOString()}`);
      lines.push('');
      lines.push(message.content || '');
      lines.push('');

      const citations = getCitationsForMessage(message);
      if (citations.length > 0) {
        lines.push('Citations:');
        citations.forEach((citation) => lines.push(`- ${citation}`));
        lines.push('');
      }
    });

    if (allCitations.length > 0) {
      lines.push('## Global Citations');
      lines.push('');
      allCitations.forEach((citation) => lines.push(`- ${citation}`));
      lines.push('');
    }

    return lines.join('\n');
  }, [chatMessages, projectName, getCitationsForMessage, allCitations]);

  const formatChatAsJSON = useCallback(() => {
    const payload = {
      projectName: projectName || 'project',
      exportedAt: new Date().toISOString(),
      messages: chatMessages.map((message) => ({
        ...message,
        citations: getCitationsForMessage(message),
      })),
      globalCitations: allCitations,
    };

    return JSON.stringify(payload, null, 2);
  }, [projectName, chatMessages, getCitationsForMessage, allCitations]);

  const formatChatAsText = useCallback(() => {
    const lines: string[] = [];

    chatMessages.forEach((message) => {
      lines.push(`[${new Date(message.timestamp).toISOString()}] ${message.role.toUpperCase()}`);
      lines.push(message.content || '');
      const citations = getCitationsForMessage(message);
      if (citations.length > 0) {
        lines.push(`Citations: ${citations.join(', ')}`);
      }
      lines.push('');
    });

    if (allCitations.length > 0) {
      lines.push(`Global Citations: ${allCitations.join(', ')}`);
    }

    return lines.join('\n');
  }, [chatMessages, getCitationsForMessage, allCitations]);

  const exportChat = useCallback((format: 'markdown' | 'json' | 'text') => {
    if (chatMessages.length === 0) return;

    if (format === 'markdown') {
      triggerDownload(buildExportFilename('md'), formatChatAsMarkdown(), 'text/markdown;charset=utf-8');
    } else if (format === 'json') {
      triggerDownload(buildExportFilename('json'), formatChatAsJSON(), 'application/json;charset=utf-8');
    } else {
      triggerDownload(buildExportFilename('txt'), formatChatAsText(), 'text/plain;charset=utf-8');
    }

    setIsExportMenuOpen(false);
  }, [chatMessages.length, triggerDownload, buildExportFilename, formatChatAsMarkdown, formatChatAsJSON, formatChatAsText]);

  if (!isRightPanelOpen) return null;

  return (
    <aside
      className="min-w-0 flex flex-col bg-deep border-l border-border-subtle animate-slide-in relative z-30 flex-shrink-0"
      style={{ width: rightPanelWidth }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-accent/30"
        onPointerDown={handleResizeStart}
      />
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-1">
          {/* Chat Tab */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'chat'
              ? 'bg-accent/15 text-accent'
              : 'text-text-muted hover:text-text-primary hover:bg-hover'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nexus AI</span>
          </button>

          {/* Processes Tab */}
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'processes'
              ? 'bg-accent/15 text-accent'
              : 'text-text-muted hover:text-text-primary hover:bg-hover'
              }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Processes</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full font-semibold">
              NEW
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'chat' && chatMessages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
                title="Export chat"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-surface border border-border-subtle rounded-md shadow-lg z-20 overflow-hidden">
                  <button onClick={() => exportChat('markdown')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-hover">
                    <FileText className="w-3.5 h-3.5" /> Markdown (.md)
                  </button>
                  <button onClick={() => exportChat('json')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-hover">
                    <Braces className="w-3.5 h-3.5" /> JSON (.json)
                  </button>
                  <button onClick={() => exportChat('text')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-hover">
                    <Type className="w-3.5 h-3.5" /> Plain text (.txt)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setRightPanelOpen(false)}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
            title="Close Panel"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Processes Tab */}
      {activeTab === 'processes' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProcessesPanel />
        </div>
      )}

      {/* Chat Content - only show when chat tab is active */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-elevated/50 border-b border-border-subtle">
            <button
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
              title="Toggle chat history"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={newChat}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
              title="Create new chat"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>

            <div className="ml-auto flex items-center gap-2">
              {!isAgentReady && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Configure AI
                </span>
              )}
              {isAgentInitializing && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-surface border border-border-subtle flex items-center gap-1 text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting
                </span>
              )}
            </div>
          </div>

          {/* Status / errors */}
          {agentError && (
            <div className="px-4 py-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-100 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{agentError}</span>
            </div>
          )}

          <div className="flex-1 min-h-0 flex">
            {isHistoryOpen && (
              <div className="w-52 border-r border-border-subtle p-2 overflow-y-auto">
                <div className="text-[11px] uppercase tracking-wide text-text-muted px-2 py-1">Sessions</div>
                <div className="space-y-1">
                  {chatSessions.length === 0 ? (
                    <div className="text-xs text-text-muted px-2 py-3">No chat sessions yet.</div>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${activeChatId === session.id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
                      >
                        <button
                          onClick={() => loadChat(session.id)}
                          className="flex-1 text-left truncate"
                          title={session.title}
                        >
                          {session.title}
                        </button>
                        <button
                          onClick={() => deleteChat(session.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/15 hover:text-rose-300"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 mb-4 flex items-center justify-center bg-gradient-to-br from-accent to-node-interface rounded-xl shadow-glow text-xl">
                    AI
                  </div>
                  <h3 className="text-base font-medium mb-2">
                    Ask me anything
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-5">
                    I can help you understand the architecture, find functions, or explain connections.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {chatSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setChatInput(suggestion)}
                        className="px-3 py-1.5 bg-elevated border border-border-subtle rounded-full text-xs text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className="animate-fade-in"
                    >
                      {/* User message - compact label style */}
                      {message.role === 'user' && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-text-muted" />
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">You</span>
                          </div>
                          <div className="pl-6 text-sm text-text-primary">
                            {message.content}
                          </div>
                        </div>
                      )}

                      {/* Assistant message - copilot style */}
                      {message.role === 'assistant' && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Nexus AI</span>
                            {isChatLoading && message === chatMessages[chatMessages.length - 1] && (
                              <Loader2 className="w-3 h-3 animate-spin text-accent" />
                            )}
                          </div>
                          <div className="pl-6 chat-prose">
                            {/* Render steps in order (reasoning, tool calls, content interleaved) */}
                            {message.steps && message.steps.length > 0 ? (
                              <div className="space-y-4">
                                {message.steps.map((step) => (
                                  <div key={step.id}>
                                    {step.type === 'reasoning' && step.content && (
                                      <div className="text-text-secondary text-sm italic border-l-2 border-text-muted/30 pl-3 mb-3">
                                        <MarkdownRenderer
                                          content={step.content}
                                          onLinkClick={handleLinkClick}
                                        />
                                      </div>
                                    )}
                                    {step.type === 'tool_call' && step.toolCall && (
                                      <div className="mb-3">
                                        <ToolCallCard toolCall={step.toolCall} defaultExpanded={false} />
                                      </div>
                                    )}
                                    {step.type === 'content' && step.content && (
                                      <MarkdownRenderer
                                        content={step.content}
                                        onLinkClick={handleLinkClick}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              // Fallback: render content + toolCalls separately (old format)
                              <MarkdownRenderer
                                content={message.content}
                                onLinkClick={handleLinkClick}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Scroll anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-surface border-t border-border-subtle">
            <div className="flex items-end gap-2 px-3 py-2 bg-elevated border border-border-subtle rounded-xl transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the codebase..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted resize-none min-h-[36px] scrollbar-thin"
                style={{ height: '36px', overflowY: 'hidden' }}
              />
              <button
                onClick={clearChat}
                className="px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
              {isChatLoading ? (
                <button
                  onClick={stopChatResponse}
                  className="w-9 h-9 flex items-center justify-center bg-red-500/80 rounded-md text-white transition-all hover:bg-red-500"
                  title="Stop response"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isAgentInitializing}
                  className="w-9 h-9 flex items-center justify-center bg-accent rounded-md text-white transition-all hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!isAgentReady && !isAgentInitializing && (
              <div className="mt-2 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {isProviderConfigured()
                    ? 'Initializing AI agent...'
                    : 'Configure an LLM provider to enable chat.'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};



