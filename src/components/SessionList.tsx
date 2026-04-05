import React from 'react';
import { Search, Plus, Download, Loader2, Filter } from 'lucide-react';
import { Session, Platform, Message } from '../types';
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
    // Try to find the last user or assistant message that has actual content
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
      <div className="p-3 md:p-6 flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-slate-800">Conversations</h2>
          <label className="cursor-pointer p-1.5 md:p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors shadow-sm">
            <Plus size={18} className="md:w-5 md:h-5" />
            <input type="file" className="hidden" onChange={handleImport} accept=".zip,.json" />
          </label>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 md:py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs md:text-sm shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={cn(
                "px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium whitespace-nowrap transition-all",
                platformFilter === p 
                  ? "bg-slate-800 text-white shadow-md" 
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-4 pb-6 space-y-1.5 md:space-y-2 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">Importing data...</span>
          </div>
        )}
        
        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No sessions found.
          </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={cn(
              "w-full text-left p-3 md:p-4 rounded-2xl transition-all duration-200 group relative",
              activeSessionId === session.id
                ? "bg-white shadow-lg border border-accent/10 ring-1 ring-accent/5"
                : "hover:bg-white/60 border border-transparent"
            )}
          >
            <div className="flex items-start justify-between mb-1.5 md:mb-2">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={session.platform} />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {session.platform}
                </span>
              </div>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">
                {getSessionDate(session)}
              </span>
            </div>
            
            <h3 className={cn(
              "text-xs md:text-sm font-semibold truncate mb-1",
              activeSessionId === session.id ? "text-slate-900" : "text-slate-700"
            )}>
              {session.title}
            </h3>
            
            <p className="text-[11px] md:text-xs text-slate-400 line-clamp-1">
              {getMessagePreview(session)}
            </p>

            {activeSessionId === session.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-accent rounded-r-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case 'ChatGPT':
      return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
    case 'Claude':
      return <div className="w-2 h-2 rounded-full bg-orange-500" />;
    case 'Gemini':
      return <div className="w-2 h-2 rounded-full bg-blue-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-slate-400" />;
  }
}
