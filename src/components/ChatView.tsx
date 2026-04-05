import React, { useState, useRef, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { Session, Message } from '../types';
import { cn } from '../App';
import { 
  User, 
  Bot, 
  Copy, 
  Check, 
  Edit2, 
  Trash2, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Terminal,
  Clock,
  Cpu,
  ArrowLeft,
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
  userProfile: { name: string; avatar: string };
  assistantProfile: { name: string; avatar: string };
}

export default function ChatView({ session, onBack, onDelete, userProfile, assistantProfile }: ChatViewProps) {
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentNode, setCurrentNode] = useState<string | undefined>(session.currentNode);

  useEffect(() => {
    setCurrentNode(session.currentNode);
  }, [session.id, session.currentNode]);

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
          <div className="bg-slate-50 rounded-xl my-3 border border-slate-200 shadow-sm overflow-hidden group/code w-full max-w-full min-w-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language || 'code'}</span>
              <button 
                onClick={() => handleCopy(codeId, content)}
                className="text-slate-400 hover:text-accent transition-colors p-1"
              >
                {copiedId === codeId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="p-3 overflow-x-auto custom-scrollbar-mini w-full">
              <pre className="text-[11px] md:text-xs font-mono text-slate-700 leading-relaxed whitespace-pre">
                <code>{codeProps.children}</code>
              </pre>
            </div>
          </div>
        );
      }
      return <pre {...props}>{children}</pre>;
    },
    code({ node, className, children, ...props }: any) {
      return (
        <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono break-all whitespace-pre-wrap" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-chat-bg">
      {/* Header */}
      <header className="px-3 md:px-6 py-2 md:py-2.5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-1 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all flex-shrink-0"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
          )}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 truncate tracking-tight">{session.title}</h2>
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                <Cpu size={8} />
                {session.model || session.platform}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Clock size={8} />
                {format(session.createTime, 'MMM d, HH:mm')}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="hidden sm:inline">{session.messages.length} msgs</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0">
          <button className="p-1.5 md:px-2 md:py-1 flex items-center gap-1 text-slate-400 hover:text-accent hover:bg-white rounded-md transition-all hover:shadow-sm">
            <Edit2 size={12} strokeWidth={2.5} />
            <span className="hidden md:inline text-[10px] font-bold">Edit</span>
          </button>
          <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
          <button 
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="p-1.5 md:px-2 md:py-1 flex items-center gap-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all hover:shadow-sm"
          >
            <Trash2 size={12} strokeWidth={2.5} />
            <span className="hidden md:inline text-[10px] font-bold">Delete</span>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-8 py-6 space-y-8 custom-scrollbar">
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
          {currentMessages.filter(msg => {
            // 过滤掉空消息
            const hasContent = msg.content.trim() || (msg.parts && msg.parts.some(p => p.type !== 'text' || p.content.trim()));
            return hasContent;
          }).map((msg) => {
            
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
                msg.role === 'user' ? "max-w-[66%]" : "w-full max-w-full"
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
                        "flex items-baseline gap-2",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                          {msg.role === 'user' ? userProfile.name : 
                           msg.role === 'dalle' ? 'DALL-E' :
                           msg.role === 'tool' ? 'System Tool' :
                           assistantProfile.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {format(msg.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      {msg.role !== 'user' && (
                        <span className="text-[8px] text-slate-400/80 font-medium leading-none mt-0.5">
                          {msg.model || session.model || session.platform}
                        </span>
                      )}
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

                {/* Images above the bubble */}
                {msg.parts && (() => {
                  const imageParts = msg.parts.filter(p => p.type === 'image');
                  if (imageParts.length === 0) return null;
                  return (
                    <div className={cn(
                      "flex flex-wrap gap-2 mb-1",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      {imageParts.map((part, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxImageId(part.imageId!)}
                          className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex-shrink-0"
                        >
                          <AsyncImage imageId={part.imageId!} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Message Content Bubble */}
                {(() => {
                  const nonImageParts = msg.parts?.filter(p => p.type !== 'image');
                  const hasNonImageContent = nonImageParts && nonImageParts.some(p =>
                    p.type !== 'text' || p.content.trim() !== ''
                  );
                  const hasPlainContent = !msg.parts && msg.content.trim();

                  if (!hasNonImageContent && !hasPlainContent) return null;

                  return (
                    <div className={cn(
                      "relative transition-all duration-200 max-w-full overflow-hidden min-w-0 flex flex-col",
                      msg.role === 'user'
                        ? "bg-bubble-user text-bubble-user-text px-3 py-2 rounded-2xl rounded-tr-none shadow-sm w-fit self-end"
                        : "bg-transparent text-slate-800 px-1 py-1 w-full"
                    )}>
                      {nonImageParts && hasNonImageContent ? (
                        <div className="flex flex-col gap-3 w-full min-w-0">
                          {nonImageParts.map((part, idx) => (
                            <div key={idx} className="w-full max-w-full min-w-0">
                              {part.type === 'text' && part.content.trim() !== '' && (
                                <div className={cn("markdown-body leading-relaxed text-[13px] break-words min-w-0", msg.role === 'user' ? "text-bubble-user-text" : "text-slate-800")}>
                                  <Markdown components={MarkdownComponents}>{part.content}</Markdown>
                                </div>
                              )}
                              {part.type === 'code' && (
                                <div className="bg-slate-50 rounded-xl my-2 border border-slate-200 shadow-sm overflow-hidden group/code w-full max-w-full min-w-0">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{part.language || 'code'}</span>
                                    <button onClick={() => handleCopy(msg.id + idx, part.content)} className="text-slate-400 hover:text-accent transition-colors p-1">
                                       {copiedId === msg.id + idx ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                  <div className="p-3 overflow-x-auto custom-scrollbar-mini w-full">
                                    <pre className="text-[11px] md:text-xs font-mono text-slate-700 leading-relaxed whitespace-pre">{part.content}</pre>
                                  </div>
                                </div>
                              )}
                              {part.type === 'output' && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-2 text-[11px] font-mono text-slate-600 leading-relaxed shadow-inner overflow-x-auto custom-scrollbar-mini w-full max-w-full min-w-0">
                                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Terminal size={12} />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Output</span>
                                  </div>
                                  <pre className="whitespace-pre-wrap">{part.content}</pre>
                                </div>
                              )}
                              {part.type === 'tool' && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full">
                                  <Info size={12} />
                                  {part.content}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={cn(
                          "markdown-body leading-relaxed text-[13px] max-w-full min-w-0 break-words",
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
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImageId(null)}
        >
          <div className="absolute inset-0 bg-white/30 backdrop-blur-2xl" />
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <AsyncImage
              imageId={lightboxImageId}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImageId(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-lg transition-colors text-lg font-medium"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
