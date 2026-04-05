import React from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
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
  isLoading
}: SessionListProps) {
  const platforms: (Platform | 'All')[] = ['All', 'ChatGPT', 'Claude', 'Gemini'];

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
    <div className="w-full h-full border-r border-list-border flex flex-col bg-list-bg">
      {/* Header with pattern */}
      <div className="p-3 md:p-5 flex flex-col gap-3 border-b border-list-border bg-sidebar-bg pattern-stripes">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-sidebar-text-active tracking-tight">Conversations</h2>
            <p className="text-[10px] text-sidebar-text font-medium">{sessions.length} chats</p>
          </div>
          <label className="cursor-pointer p-2 bg-white text-accent rounded-xl hover:shadow-md transition-all shadow-sm border border-list-border">
            <Plus size={16} />
            <input type="file" className="hidden" onChange={handleImport} accept=".zip,.json" />
          </label>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-text group-focus-within:text-accent transition-colors" size={14} />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-white/90 backdrop-blur-sm border border-list-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs shadow-sm placeholder:text-sidebar-text"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border",
                platformFilter === p
                  ? "bg-white text-sidebar-text-active border-list-border shadow-sm"
                  : "bg-transparent text-sidebar-text border-transparent hover:bg-white/50"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-3 py-3 space-y-1 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sidebar-text gap-2">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-xs">Importing...</span>
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sidebar-text">
            <div className="w-16 h-16 rounded-2xl bg-sidebar-active/50 flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
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
              "w-full text-left p-3 rounded-xl transition-all duration-200 group relative",
              activeSessionId === session.id
                ? "bg-white shadow-sm border border-list-border"
                : "hover:bg-white/60 border border-transparent"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <PlatformDot platform={session.platform} />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-sidebar-text">
                  {session.platform}
                </span>
              </div>
              <span className="text-[9px] text-sidebar-text font-medium">
                {getSessionDate(session)}
              </span>
            </div>

            <h3 className={cn(
              "text-xs font-semibold truncate mb-0.5",
              activeSessionId === session.id ? "text-sidebar-text-active" : "text-sidebar-text-active/80"
            )}>
              {session.title}
            </h3>

            <p className="text-[10px] text-sidebar-text line-clamp-1">
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
