import React, { useState } from 'react';
import { Search, Plus, Loader2, MessageSquare, User, X } from 'lucide-react';
import { Session, Platform } from '../types';
import { cn } from '../App';
import { format } from 'date-fns';

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  platformFilter: Platform | 'All';
  setPlatformFilter: (filter: Platform | 'All') => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  userProfile?: { name: string; avatar: string };
}

export default function SessionList({
  sessions,
  activeSessionId,
  setActiveSessionId,
  searchQuery,
  setSearchQuery,
  platformFilter,
  setPlatformFilter,
  handleImport,
  isLoading,
  userProfile
}: SessionListProps) {
  const platforms: (Platform | 'All')[] = ['All', 'ChatGPT', 'Claude', 'Gemini'];
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const getLastMessage = (session: Session) => {
    const validMessages = session.messages.filter(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      (m.content?.trim() || (m.parts && m.parts.length > 0))
    );
    if (validMessages.length > 0) {
      return validMessages[validMessages.length - 1];
    }
    return session.messages[session.messages.length - 1];
  };

  const getMessagePreview = (session: Session) => {
    const message = getLastMessage(session);
    if (!message) return 'No messages';
    if (message.content?.trim()) return message.content;
    if (message.parts && message.parts.length > 0) {
      const textPart = message.parts.find(p => p.type === 'text');
      if (textPart && textPart.content?.trim()) return textPart.content;
      const imagePart = message.parts.find(p => p.type === 'image');
      if (imagePart) return '[Image]';
      return '[Attachment]';
    }
    return 'No messages';
  };

  const getSessionDate = (session: Session) => {
    const lastMessage = getLastMessage(session);
    const timestamp = lastMessage?.timestamp || session.updateTime || session.createTime;
    return format(timestamp, 'yy-MM-dd');
  };

  return (
    <div className="w-full h-full border-r border-list-border flex flex-col bg-white">
      {/* Header */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-5 py-8 md:py-8 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-handwriting text-sidebar-text-active">Conversations</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchQuery(''); }}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full shadow-sm border flex-shrink-0 transition-all",
                isSearchOpen ? "bg-accent text-white border-accent" : "bg-white text-sidebar-text hover:text-accent border-list-border"
              )}
            >
              {isSearchOpen ? <X size={13} /> : <Search size={13} />}
            </button>
            <label className="cursor-pointer w-8 h-8 flex items-center justify-center bg-white text-sidebar-text hover:text-accent rounded-full shadow-sm border border-list-border flex-shrink-0 transition-all">
              <Plus size={14} />
              <input type="file" className="hidden" onChange={handleImport} accept=".zip,.json" multiple />
            </label>
          </div>
        </div>
        {isSearchOpen ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-text" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-16 py-1 text-xs bg-white border border-list-border rounded-full focus:outline-none focus:border-accent transition-colors placeholder-sidebar-text/50"
                autoFocus
              />
              {searchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] text-sidebar-text font-medium">
                    {sessions.length} results
                  </span>
                  <button onClick={() => setSearchQuery('')} className="text-sidebar-text hover:text-accent">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] md:text-[10px] font-semibold whitespace-nowrap transition-all border",
                  platformFilter === p
                    ? "bg-white text-sidebar-text-active border-list-border shadow-sm"
                    : "bg-transparent text-sidebar-text border-transparent hover:bg-white/50"
                )}
              >
                {p}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-sidebar-text flex-shrink-0">{userProfile?.name}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-3 py-2 md:py-3 pb-16 md:pb-3 space-y-2.5 md:space-y-1 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sidebar-text gap-2">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-xs">Importing...</span>
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sidebar-text">
            <div className="w-14 h-14 rounded-2xl bg-sidebar-active/50 border border-list-border flex items-center justify-center mb-4">
              <MessageSquare size={22} strokeWidth={1.5} />
            </div>
            <p className="text-xs font-medium mb-1">No conversations yet</p>
            <p className="text-[10px] opacity-70">Import a ZIP or JSON to get started</p>
          </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={cn(
              "w-full text-left p-4 md:p-3 rounded-2xl md:rounded-lg transition-all duration-200 group relative",
              "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-list-border",
              "active:scale-[0.98]",
              activeSessionId === session.id
                ? "ring-1 ring-accent/20 shadow-md"
                : "md:bg-transparent md:shadow-none md:border-transparent md:hover:bg-white/50"
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <PlatformDot platform={session.platform} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-text">
                  {session.platform}
                </span>
              </div>
              <span className="text-[10px] text-sidebar-text font-medium">
                {getSessionDate(session)}
              </span>
            </div>

            <h3 className={cn(
              "text-sm md:text-xs font-bold truncate",
              activeSessionId === session.id ? "text-sidebar-text-active" : "text-sidebar-text-active/80"
            )}>
              {session.title}
            </h3>

            <p className="text-xs md:text-[10px] text-sidebar-text truncate mt-0.5">
              {getMessagePreview(session)}
            </p>

            {activeSessionId === session.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-r-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformDot({ platform }: { platform: Platform }) {
  const colors: Record<string, string> = {
    ChatGPT: 'bg-emerald-400',
    Claude: 'bg-orange-400',
    Gemini: 'bg-blue-400',
  };
  return <div className={cn("w-1.5 h-1.5 rounded-full", colors[platform] || 'bg-slate-400')} />;
}
