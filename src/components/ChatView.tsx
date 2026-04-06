import React, { useState, useRef, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { Session, Message } from '../types';
import { cn } from '../App';
import { 
  User, 
  Bot, 
  Copy, 
  Check, 
  Trash2,
  Info, 
  ChevronDown, 
  ChevronUp,
  Terminal,
  Clock,
  Cpu,
  ArrowLeft,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import ConfirmModal from './ConfirmModal';
import AsyncImage from './AsyncImage';

interface ChatViewProps {
  session: Session;
  onBack?: () => void;
  onDelete?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  userProfile: { name: string; avatar: string };
  assistantProfile: { name: string; avatar: string };
}

const PAGE_SIZE = 50;

export default function ChatView({ session, onBack, onDelete, onUpdateTitle, userProfile, assistantProfile }: ChatViewProps) {
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentNode, setCurrentNode] = useState<string | undefined>(session.currentNode);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setCurrentNode(session.currentNode);
    setVisibleCount(PAGE_SIZE);
  }, [session.id, session.currentNode, session.title]);

  const currentMessages = useMemo(() => {
    if (!session.mapping || !currentNode) return session.messages;
    
    const path: Message[] = [];
    let tempId: string | null = currentNode;
    while (tempId && session.mapping[tempId]) {
      const node = session.mapping[tempId];
      if (node.message) {
        path.unshift(node.message);
      }
      tempId = node.parent;
    }
    return path;
  }, [session, currentNode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [session.id]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const MarkdownComponents = {
    hr({ node, ...props }: any) {
      return <hr className="mt-4 mb-6 border-slate-200" {...props} />;
    },
    pre({ children, ...props }: any) {
      if (React.isValidElement(children) && children.type === 'code') {
        const codeProps = children.props as any;
        const match = /language-(\w+)/.exec(codeProps.className || '');
        const language = match ? match[1] : '';
        const content = String(codeProps.children).replace(/\n$/, '');
        const codeId = Math.random().toString(36).substr(2, 9);
        
        return (
          <div className="bg-sidebar-bg/50 rounded-xl my-2 border border-list-border overflow-hidden group/code w-full max-w-full min-w-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-bg border-b border-list-border">
              <span className="text-[10px] font-semibold text-sidebar-text uppercase tracking-widest">{language || 'code'}</span>
              <button
                onClick={() => handleCopy(codeId, content)}
                className="text-sidebar-text hover:text-accent transition-colors p-1"
              >
                {copiedId === codeId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="p-3 overflow-x-auto custom-scrollbar-mini w-full max-h-[400px] overflow-y-auto">
              <pre className="text-[11px] md:text-xs font-mono text-sidebar-text-active leading-relaxed whitespace-pre">
                <code>{codeProps.children}</code>
              </pre>
            </div>
          </div>
        );
      }
      // Fallback for pre blocks not wrapping a <code> element
      const fallbackContent = String(children?.props?.children || children || '').replace(/\n$/, '');
      const fallbackId = Math.random().toString(36).substr(2, 9);
      return (
        <div className="bg-sidebar-bg/50 rounded-xl my-2 border border-list-border overflow-hidden group/code w-full max-w-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-bg border-b border-list-border">
            <span className="text-[10px] font-semibold text-sidebar-text uppercase tracking-widest">code</span>
            <button
              onClick={() => handleCopy(fallbackId, fallbackContent)}
              className="text-sidebar-text hover:text-accent transition-colors p-1"
            >
              {copiedId === fallbackId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="p-3 overflow-x-auto custom-scrollbar-mini w-full max-h-[400px] overflow-y-auto">
            <pre className="text-[11px] md:text-xs font-mono text-sidebar-text-active leading-relaxed whitespace-pre">{children}</pre>
          </div>
        </div>
      );
    },
    code({ node, className, children, ...props }: any) {
      // Check if this is inside a pre (code block) — if so, render plain
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return <code {...props}>{children}</code>;
      }
      return (
        <code className="bg-sidebar-bg text-sidebar-text-active px-1 py-0.5 rounded text-[12px] font-mono" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white">
      {/* Header */}
      <header className="px-3 md:px-6 py-2 md:py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden w-9 h-9 flex items-center justify-center text-sidebar-text-active bg-white/40 backdrop-blur-md rounded-full flex-shrink-0"
            >
              <Menu size={16} strokeWidth={2} />
            </button>
          )}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 truncate tracking-tight">{session.title}</h2>
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white/60 backdrop-blur-md rounded-full text-[8px] font-bold text-slate-500 uppercase tracking-widest border border-list-border">
                <Cpu size={8} />
                {session.model || session.platform}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-sidebar-text font-medium">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Clock size={8} />
                {format(session.createTime, 'MMM d, HH:mm')}
              </span>
              <span className="hidden sm:inline text-sidebar-text/50">·</span>
              <span className="hidden sm:inline">{session.messages.length} msgs</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-sidebar-text-active bg-white/40 backdrop-blur-md rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </header>

      <ConfirmModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => onDelete?.(session.id)}
        title="Delete Session?"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete Session"
        variant="danger"
      />

      {/* Main Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 md:px-10 py-6 space-y-8 custom-scrollbar">
        {/* System Prompt Section */}
        {session.systemPrompt && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className={cn(
              "rounded-2xl border transition-all duration-300 overflow-hidden",
              isSystemPromptOpen 
                ? "bg-slate-900 border-slate-800 shadow-2xl" 
                : "bg-slate-50 border-slate-200 shadow-sm"
            )}>
              <button 
                onClick={() => setIsSystemPromptOpen(!isSystemPromptOpen)}
                className={cn(
                  "w-full px-4 py-3 flex items-center justify-between transition-colors",
                  isSystemPromptOpen ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Terminal size={16} className={isSystemPromptOpen ? "text-accent" : "text-slate-400"} />
                  <span className="text-xs font-bold tracking-tight">System Prompt</span>
                </div>
                {isSystemPromptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {isSystemPromptOpen && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-x-auto custom-scrollbar-mini">
                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {session.systemPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="max-w-3xl mx-auto space-y-6">
          {(() => {
            const filteredMessages = currentMessages.filter(msg => {
              const hasContent = msg.content.trim() || (msg.parts && msg.parts.some(p => p.type !== 'text' || p.content.trim()));
              return hasContent;
            });
            const total = filteredMessages.length;
            const visibleMessages = filteredMessages.slice(0, visibleCount);
            const remaining = total - visibleCount;
            return (
              <>
                {visibleMessages.map((msg) => {
            
            let branchInfo = null;
            if (session.mapping) {
              const node = session.mapping[msg.id];
              if (node && node.parent) {
                const parentNode = session.mapping[node.parent];
                if (parentNode && parentNode.children.length > 1) {
                  const siblings = parentNode.children;
                  const currentIndex = siblings.indexOf(msg.id);
                  branchInfo = {
                    currentIndex,
                    total: siblings.length,
                    siblings
                  };
                }
              }
            }

            const handleBranchChange = (siblings: string[], direction: -1 | 1, currentIndex: number) => {
              const newIndex = currentIndex + direction;
              if (newIndex >= 0 && newIndex < siblings.length) {
                let leafId = siblings[newIndex];
                while (session.mapping![leafId] && session.mapping![leafId].children.length > 0) {
                  const children = session.mapping![leafId].children;
                  leafId = children[children.length - 1];
                }
                setCurrentNode(leafId);
              }
            };

            return (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col w-full min-w-0",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "flex flex-col gap-1.5 group min-w-0",
                msg.role === 'user' ? "max-w-[75%]" : "w-full max-w-full"
              )}>
                {/* Message Header: Avatar, Name, Time, and Copy Button */}
                <div className={cn(
                  "flex items-center justify-between w-full px-1",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "flex items-center gap-2",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0",
                      msg.role === 'user' ? "bg-accent text-white" : 
                      msg.role === 'dalle' ? "bg-purple-500 text-white" :
                      msg.role === 'tool' ? "bg-slate-100 text-slate-400" :
                      "bg-white border border-slate-200 text-slate-600"
                    )}>
                      {msg.role === 'user' ? (
                        userProfile.avatar ? <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User size={14} />
                      ) : msg.role === 'dalle' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                           <span className="text-[10px]">🎨</span>
                        </div>
                      ) : msg.role === 'tool' ? (
                        <Terminal size={12} />
                      ) : (
                        assistantProfile.avatar ? <img src={assistantProfile.avatar} alt="Assistant" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Bot size={14} />
                      )}
                    </div>
                    <div className={cn(
                      "flex flex-col",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "flex items-baseline gap-1.5",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                          {msg.role === 'user' ? userProfile.name :
                           msg.role === 'dalle' ? 'DALL-E' :
                           msg.role === 'tool' ? 'System Tool' :
                           assistantProfile.name}
                        </span>
                        {msg.role !== 'user' && (
                          <span className="text-[8px] text-slate-400/80 font-medium">
                            {msg.model || session.model || session.platform}
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[8px] text-slate-400 font-medium leading-none mt-0.5", msg.role === 'user' && "text-right")}>
                        {format(msg.timestamp, 'yy-MM-dd HH:mm')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Copy Button */}
                  <button 
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-md transition-all flex-shrink-0"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Images and files above the bubble — grid layout */}
                {msg.parts && (() => {
                  const mediaParts = msg.parts.filter(p => p.type === 'image' || p.type === 'file');
                  const count = mediaParts.length;
                  if (count === 0) return null;

                  const cols = count === 1 ? 1 : count <= 3 ? count : count === 4 ? 2 : 3;
                  const gridClass = cn(
                    cols === 1 && "grid-cols-1 max-w-[14rem] md:max-w-[16rem]",
                    cols === 2 && "grid-cols-2 max-w-[20rem] md:max-w-[24rem]",
                    cols === 3 && "grid-cols-3 max-w-[24rem] md:max-w-[28rem]",
                  );

                  return (
                    <div className={cn(
                      "mb-1",
                      msg.role === 'user' ? "ml-auto" : "mr-auto"
                    )}>
                      <div className={cn("grid gap-1.5", gridClass)}>
                        {mediaParts.map((part, idx) => (
                          part.type === 'image' ? (
                            <button
                              key={idx}
                              onClick={() => setLightboxImageId(part.imageId!)}
                              className="aspect-square overflow-hidden bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity rounded-xl border border-list-border"
                            >
                              <AsyncImage imageId={part.imageId!} className="w-full h-full object-cover" />
                            </button>
                          ) : part.type === 'file' ? (
                            <details key={idx} className="aspect-square bg-sidebar-bg border border-list-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-sidebar-active transition-colors overflow-hidden">
                              <summary className="h-full w-full flex flex-col items-center justify-center gap-1.5 p-2 list-none cursor-pointer">
                                <Terminal size={20} className="text-sidebar-text" />
                                <span className="text-[9px] font-semibold text-sidebar-text-active text-center leading-tight break-all">{part.filename}</span>
                              </summary>
                              <div className="p-2 text-[10px] font-mono text-sidebar-text leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar-mini border-t border-list-border bg-white">
                                {part.content}
                              </div>
                            </details>
                          ) : null
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Message Content Bubble */}
                {(() => {
                  const nonImageParts = msg.parts?.filter(p => p.type !== 'image' && p.type !== 'file');
                  const hasNonImageContent = nonImageParts && nonImageParts.some(p =>
                    p.type !== 'text' || p.content.trim() !== ''
                  );
                  const hasPlainContent = !msg.parts && msg.content.trim();

                  if (!hasNonImageContent && !hasPlainContent) return null;

                  return (
                    <div className={cn(
                      "relative transition-all duration-200 max-w-full overflow-hidden overflow-x-auto min-w-0 flex flex-col",
                      msg.role === 'user'
                        ? "bg-bubble-user text-bubble-user-text px-4 py-2.5 rounded-2xl rounded-tr-none self-end"
                        : "bg-transparent text-slate-800 px-1 py-1 w-full"
                    )}>
                      {nonImageParts && hasNonImageContent ? (
                        <div className="flex flex-col gap-1 w-full min-w-0">
                          {(() => {
                            // 把连续的 thinking/tool/output 合并成 process 组
                            type GroupItem = { type: 'text' | 'code', part: any } | { type: 'process', steps: any[] };
                            const groups: GroupItem[] = [];
                            let currentProcess: any[] = [];

                            const flushProcess = () => {
                              if (currentProcess.length > 0) {
                                groups.push({ type: 'process', steps: [...currentProcess] });
                                currentProcess = [];
                              }
                            };

                            for (const part of nonImageParts) {
                              if (part.type === 'thinking' || part.type === 'tool' || part.type === 'output') {
                                currentProcess.push(part);
                              } else {
                                flushProcess();
                                groups.push({ type: part.type as 'text' | 'code', part });
                              }
                            }
                            flushProcess();

                            return groups.map((group, gIdx) => {
                              if (group.type === 'process') {
                                const steps = group.steps;
                                const toolNames = steps.filter(s => s.type === 'tool').map(s => s.content.replace(/^Tool:\s*/i, ''));
                                const thinkCount = steps.filter(s => s.type === 'thinking').length;
                                // 只有一个 thinking 且没有 tool，直接显示为单独的 thinking 框
                                if (steps.length === 1 && steps[0].type === 'thinking') {
                                  return (
                                    <details key={gIdx} className="bg-sidebar-bg/50 border border-list-border rounded-xl my-1 w-full overflow-hidden">
                                      <summary className="px-3 py-2 cursor-pointer text-[10px] font-semibold text-sidebar-text uppercase tracking-widest select-none hover:bg-sidebar-bg transition-colors flex items-center gap-1.5">
                                        <ChevronRight size={10} className="details-arrow transition-transform" />
                                        Thinking
                                      </summary>
                                      <div className="px-3 pb-3 pt-1 text-xs text-sidebar-text leading-relaxed whitespace-pre-wrap border-t border-list-border max-h-[300px] overflow-y-auto custom-scrollbar-mini">
                                        {steps[0].content}
                                      </div>
                                    </details>
                                  );
                                }
                                // 多步合并为一个 process 框
                                const uniqueTools = [...new Set(toolNames)];
                                const summary = uniqueTools.length > 0
                                  ? `${uniqueTools.join(', ')}${thinkCount > 0 ? ` + ${thinkCount} thinking` : ''}`
                                  : `Thinking (${thinkCount} steps)`;
                                return (
                                  <details key={gIdx} className="bg-sidebar-bg/50 border border-list-border rounded-xl my-1 w-full overflow-hidden">
                                    <summary className="px-3 py-2 cursor-pointer text-[10px] font-semibold text-sidebar-text uppercase tracking-widest select-none hover:bg-sidebar-bg transition-colors flex items-center gap-1.5">
                                      <ChevronRight size={10} className="details-arrow transition-transform" />
                                      <Cpu size={10} />
                                      {summary}
                                    </summary>
                                    <div className="border-t border-list-border max-h-[500px] overflow-y-auto custom-scrollbar-mini">
                                      {steps.map((step, sIdx) => (
                                        <div key={sIdx} className={cn("px-3 py-2", sIdx > 0 && "border-t border-list-border/50")}>
                                          <div className="text-[9px] font-bold text-sidebar-text uppercase tracking-widest mb-1 flex items-center gap-1">
                                            {step.type === 'thinking' && <>Thinking</>}
                                            {step.type === 'tool' && <><Info size={8} /> {step.content}</>}
                                            {step.type === 'output' && <><Terminal size={8} /> Output</>}
                                          </div>
                                          {step.type === 'thinking' && step.content && (
                                            <div className="text-[10px] text-sidebar-text leading-snug whitespace-pre-wrap">
                                              {step.content}
                                            </div>
                                          )}
                                          {step.type === 'output' && step.content && (
                                            <div className="text-[10px] font-mono text-sidebar-text leading-relaxed whitespace-pre-wrap">
                                              {(() => {
                                                try {
                                                  const parsed = JSON.parse(step.content);
                                                  if (Array.isArray(parsed)) {
                                                    return (
                                                      <div className="space-y-2 pt-1">
                                                        {parsed.map((item: any, i: number) => (
                                                          <div key={i} className="bg-white/60 rounded-lg p-2 border border-list-border/50">
                                                            {item.title && <div className="text-[11px] font-semibold text-sidebar-text-active">{item.title}</div>}
                                                            {item.url && <div className="text-[9px] text-accent truncate">{item.url}</div>}
                                                            {item.text && <div className="text-[9px] text-sidebar-text mt-1 line-clamp-2">{item.text.slice(0, 200)}</div>}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    );
                                                  }
                                                  // bash tool 结果：显示 stdout/stderr
                                                  if (parsed.stdout !== undefined || parsed.stderr !== undefined) {
                                                    const output = (parsed.stdout || '') + (parsed.stderr ? '\n[stderr] ' + parsed.stderr : '');
                                                    return <pre className="whitespace-pre-wrap bg-white/40 rounded-lg p-2 border border-list-border/50 text-[10px]">{output.replace(/\\n/g, '\n')}</pre>;
                                                  }
                                                  return <pre className="whitespace-pre-wrap bg-white/40 rounded-lg p-2 border border-list-border/50 text-[10px]">{JSON.stringify(parsed, null, 2)}</pre>;
                                                } catch {
                                                  return step.content;
                                                }
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                );
                              }

                              const part = (group as any).part;
                              return (
                                <div key={gIdx} className="w-full max-w-full min-w-0">
                                  {part.type === 'text' && part.content.trim() !== '' && (
                                    <div className={cn("markdown-body text-[length:var(--chat-font-size,15px)] leading-[var(--chat-line-height,1.6)] break-words min-w-0", msg.role === 'user' ? "text-bubble-user-text" : "text-slate-800 w-full")}>
                                      <Markdown components={MarkdownComponents}>{part.content}</Markdown>
                                    </div>
                                  )}
                                  {part.type === 'code' && (
                                    <div className="bg-sidebar-bg/50 rounded-xl my-1 border border-list-border overflow-hidden w-full max-w-full min-w-0">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-bg border-b border-list-border">
                                        <span className="text-[10px] font-semibold text-sidebar-text uppercase tracking-widest">{part.language || 'code'}</span>
                                        <button onClick={() => handleCopy(msg.id + gIdx, part.content)} className="text-sidebar-text hover:text-accent transition-colors p-1">
                                           {copiedId === msg.id + gIdx ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        </button>
                                      </div>
                                      <div className="p-3 overflow-x-auto custom-scrollbar-mini w-full max-h-[400px] overflow-y-auto">
                                        <pre className="text-[11px] md:text-xs font-mono text-sidebar-text-active leading-relaxed whitespace-pre-wrap">{part.content}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <div className={cn(
                          "markdown-body text-[length:var(--chat-font-size,15px)] leading-[var(--chat-line-height,1.6)] max-w-full min-w-0 break-words",
                          msg.role === 'user' ? "text-bubble-user-text" : "text-slate-800 w-full"
                        )}>
                          <Markdown components={MarkdownComponents}>{msg.content}</Markdown>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Branch Selector */}
                {branchInfo && (
                  <div className={cn(
                    "flex items-center gap-2 mt-1 text-[10px] font-medium text-slate-400 select-none",
                    msg.role === 'user' ? "self-end mr-1" : "ml-1"
                  )}>
                    <button 
                      onClick={() => handleBranchChange(branchInfo!.siblings, -1, branchInfo!.currentIndex)}
                      disabled={branchInfo.currentIndex === 0}
                      className="p-1 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <span>{branchInfo.currentIndex + 1} / {branchInfo.total}</span>
                    <button 
                      onClick={() => handleBranchChange(branchInfo!.siblings, 1, branchInfo!.currentIndex)}
                      disabled={branchInfo.currentIndex === branchInfo.total - 1}
                      className="p-1 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
                {remaining > 0 && (
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="w-full py-2 text-[11px] font-semibold text-sidebar-text hover:text-accent bg-white/60 backdrop-blur-md rounded-xl border border-list-border transition-colors"
                  >
                    加载更多 ({remaining} 条)
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImageId(null)}
        >
          <div className="absolute inset-0 bg-white/30 backdrop-blur-2xl" />
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <AsyncImage
              imageId={lightboxImageId}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
