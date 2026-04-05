import React from 'react';
import { Search, Plus, Loader2, MessageSquare, User } from 'lucide-react';
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
      <div className="p-2.5 md:p-5 flex flex-col gap-2 md:gap-3 border-b border-list-border bg-sidebar-bg pattern-stripes">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base md:text-lg font-bold text-sidebar-text-active tracking-tight">Conversations</h2>
            <span className="text-[9px] text-sidebar-text font-medium mt-0.5">{sessions.length} chats</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: user avatar + name on the right */}
            <div className="md:hidden flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-sidebar-text">{userProfile?.name}</span>
              <div className="w-7 h-7 rounded-lg bg-white border border-list-border shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                {userProfile?.avatar ? (
                  <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={12} className="text-sidebar-text" />
                )}
              </div>
            </div>
            {/* Desktop: + button */}
            <label className="hidden md:flex cursor-pointer p-2 bg-white text-accent rounded-xl hover:shadow-md transition-all shadow-sm border border-list-border">
              <Plus size={16} />
              <input type="file" className="hidden" onChange={handleImport} accept=".zip,.json" />
            </label>
          </div>
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
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
          {/* Mobile: + button next to filter tabs */}
          <label className="md:hidden cursor-pointer p-1 bg-white text-accent rounded-full border border-list-border flex-shrink-0 ml-auto">
            <Plus size={14} />
            <input type="file" className="hidden" onChange={handleImport} accept=".zip,.json" />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 md:px-3 py-2 md:py-3 pb-16 md:pb-3 space-y-0 md:space-y-1 custom-scrollbar">
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
              "w-full text-left px-2.5 py-1.5 md:p-3 rounded-lg transition-colors duration-200 group relative",
              activeSessionId === session.id
                ? "bg-white shadow-sm border border-list-border"
                : "hover:bg-white/50"
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
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
