import React, { useState, useRef, useMemo } from 'react';
import {
  Trash2,
  Shield,
  Info,
  FileText,
  BarChart3,
  User,
  Database,
  Upload,
  MessageSquare,
  Calendar,
  Clock,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { Session, Platform } from '../types';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../App';
import ConfirmModal from './ConfirmModal';

interface SettingsViewProps {
  sessions: Session[];
  userProfile: { name: string; avatar: string };
  assistantProfiles: Record<Platform, { name: string; avatar: string }>;
  onUpdateUser: (profile: { name: string; avatar: string }) => void;
  onUpdateAssistant: (platform: Platform, profile: { name: string; avatar: string }) => void;
  onClearData: () => void;
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-white border border-list-border rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
      />
    </div>
  );
}

function AvatarUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        className="w-12 h-12 rounded-xl bg-white border border-list-border overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-accent transition-all group relative"
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User size={18} className="text-sidebar-text group-hover:text-accent transition-colors" />
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Upload size={12} className="text-white" />
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function usePlatformStats(sessions: Session[], platform?: Platform) {
  return useMemo(() => {
    const filtered = platform ? sessions.filter(s => s.platform === platform) : sessions;
    if (filtered.length === 0) return null;

    const allMessages = filtered.flatMap(s => s.messages);
    const userMessages = allMessages.filter(m => m.role === 'user').length;
    const assistantMessages = allMessages.filter(m => m.role === 'assistant').length;

    const sorted = [...filtered].sort((a, b) => a.createTime - b.createTime);
    const firstDate = sorted[0].createTime;
    const lastDate = sorted[sorted.length - 1].createTime;
    const totalDays = Math.max(1, differenceInDays(Date.now(), firstDate));

    // 每日统计找最活跃的一天
    const dayMap = new Map<string, number>();
    filtered.forEach(s => {
      const key = format(s.createTime, 'yyyy-MM-dd');
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });
    const mostActiveDay = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0];

    // 消息最多的一天
    const msgDayMap = new Map<string, number>();
    allMessages.forEach(m => {
      if (m.timestamp) {
        const key = format(m.timestamp, 'yyyy-MM-dd');
        msgDayMap.set(key, (msgDayMap.get(key) || 0) + 1);
      }
    });
    const mostMessageDay = [...msgDayMap.entries()].sort((a, b) => b[1] - a[1])[0];

    // 每月统计
    const monthlyMap = new Map<string, number>();
    filtered.forEach(s => {
      const key = format(s.createTime, 'yyyy-MM');
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });
    const monthlyEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const maxMonthly = Math.max(...monthlyEntries.map(e => e[1]));

    // 最活跃小时
    const hourMap = new Array(24).fill(0);
    allMessages.forEach(m => {
      if (m.timestamp) hourMap[new Date(m.timestamp).getHours()]++;
    });
    const maxHour = hourMap.indexOf(Math.max(...hourMap));

    // 最长对话
    const longestSession = [...filtered].sort((a, b) => b.messages.length - a.messages.length)[0];

    return {
      sessionCount: filtered.length,
      totalMessages: allMessages.length,
      userMessages,
      assistantMessages,
      firstDate,
      lastDate,
      totalDays,
      mostActiveDay,
      mostMessageDay,
      monthlyEntries,
      maxMonthly,
      maxHour,
      longestSession,
    };
  }, [sessions, platform]);
}

function StatsPanel({ stats }: { stats: NonNullable<ReturnType<typeof usePlatformStats>> }) {
  return (
    <div className="space-y-5">
      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 bg-list-bg rounded-xl">
          <FileText size={14} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-sidebar-text-active">{stats.sessionCount.toLocaleString()}</p>
            <p className="text-[9px] text-sidebar-text">Conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-list-bg rounded-xl">
          <MessageSquare size={14} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-sidebar-text-active">{stats.totalMessages.toLocaleString()}</p>
            <p className="text-[9px] text-sidebar-text">Total messages</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-list-bg rounded-xl">
          <Heart size={14} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-sidebar-text-active">{stats.userMessages.toLocaleString()}</p>
            <p className="text-[9px] text-sidebar-text">You sent</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-list-bg rounded-xl">
          <Clock size={14} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-sidebar-text-active">{stats.maxHour}:00</p>
            <p className="text-[9px] text-sidebar-text">Most active hour</p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest">Milestones</p>
        <div className="bg-list-bg rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-sidebar-text">First conversation</span>
            <span className="text-[11px] font-bold text-sidebar-text-active">{format(stats.firstDate, 'yyyy-MM-dd')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-sidebar-text">Days together</span>
            <span className="text-[11px] font-bold text-sidebar-text-active">{stats.totalDays} days</span>
          </div>
          {stats.mostActiveDay && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sidebar-text">Most active day</span>
              <span className="text-[11px] font-bold text-sidebar-text-active">{stats.mostActiveDay[0]} ({stats.mostActiveDay[1]} chats)</span>
            </div>
          )}
          {stats.mostMessageDay && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sidebar-text">Most messages in a day</span>
              <span className="text-[11px] font-bold text-sidebar-text-active">{stats.mostMessageDay[0]} ({stats.mostMessageDay[1]} msgs)</span>
            </div>
          )}
        </div>
      </div>

      {/* Monthly trend */}
      {stats.monthlyEntries.length > 1 && (
        <div>
          <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">Monthly Trend</p>
          <div className="flex items-end gap-[3px]" style={{ height: 80 }}>
            {stats.monthlyEntries.map(([month, count]) => (
              <div
                key={month}
                className="flex-1 bg-accent/50 rounded-t-sm hover:bg-accent/70 transition-colors min-w-0"
                style={{ height: `${Math.max(2, (count / stats.maxMonthly) * 100)}%` }}
                title={`${month}: ${count} chats`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-sidebar-text">{stats.monthlyEntries[0]?.[0]}</span>
            <span className="text-[8px] text-sidebar-text">{stats.monthlyEntries[stats.monthlyEntries.length - 1]?.[0]}</span>
          </div>
        </div>
      )}

      {/* Longest session */}
      <div className="flex items-center gap-3 p-3 bg-list-bg rounded-xl">
        <BarChart3 size={14} className="text-accent flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] text-sidebar-text">Longest conversation</p>
          <p className="text-[11px] font-bold text-sidebar-text-active truncate">{stats.longestSession.title}</p>
          <p className="text-[9px] text-sidebar-text">{stats.longestSession.messages.length} messages</p>
        </div>
      </div>
    </div>
  );
}

type SettingsTab = 'Settings' | 'ChatGPT' | 'Claude' | 'Gemini';

export default function SettingsView({
  sessions,
  userProfile,
  assistantProfiles,
  onUpdateUser,
  onUpdateAssistant,
  onClearData
}: SettingsViewProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('Settings');

  const tabs: SettingsTab[] = ['Settings', 'ChatGPT', 'Claude', 'Gemini'];

  const allStats = usePlatformStats(sessions);
  const chatgptStats = usePlatformStats(sessions, 'ChatGPT');
  const claudeStats = usePlatformStats(sessions, 'Claude');
  const geminiStats = usePlatformStats(sessions, 'Gemini');

  const platformStatsMap: Record<Platform, ReturnType<typeof usePlatformStats>> = {
    ChatGPT: chatgptStats,
    Claude: claudeStats,
    Gemini: geminiStats,
  };

  const platformDotColor: Record<Platform, string> = {
    ChatGPT: 'bg-emerald-400',
    Claude: 'bg-orange-400',
    Gemini: 'bg-blue-400',
  };

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto pb-16 md:pb-0 custom-scrollbar">
      {/* Header with tabs */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-12 py-8 md:py-10 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-handwriting text-sidebar-text-active">Settings</h2>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] md:text-[10px] font-semibold whitespace-nowrap transition-all border",
                activeTab === tab
                  ? "bg-white text-sidebar-text-active border-list-border shadow-sm"
                  : "bg-transparent text-sidebar-text border-transparent hover:bg-white/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 py-6 md:py-8 max-w-4xl">
        {activeTab === 'Settings' && (
          <>
            {/* Profiles */}
            <div className="bg-white rounded-2xl border border-list-border shadow-sm p-5 mb-6 md:mb-8">
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-4">Profiles</p>
              <div className="grid grid-cols-2 gap-4">
                {/* User */}
                <div className="flex items-start gap-2.5">
                  <AvatarUpload value={userProfile.avatar} onChange={(v) => onUpdateUser({ ...userProfile, avatar: v })} />
                  <div className="flex-1">
                    <EditableField label="Your Name" value={userProfile.name} onChange={(v) => onUpdateUser({ ...userProfile, name: v })} />
                  </div>
                </div>
                {/* Assistants */}
                {(['ChatGPT', 'Claude', 'Gemini'] as Platform[]).map((platform) => (
                  <div key={platform} className="flex items-start gap-2.5">
                    <AvatarUpload
                      value={assistantProfiles[platform].avatar}
                      onChange={(v) => onUpdateAssistant(platform, { ...assistantProfiles[platform], avatar: v })}
                    />
                    <div className="flex-1">
                      <EditableField
                        label={platform}
                        value={assistantProfiles[platform].name}
                        onChange={(v) => onUpdateAssistant(platform, { ...assistantProfiles[platform], name: v })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Stats */}
            {allStats && (
              <div className="bg-white rounded-2xl border border-list-border shadow-sm overflow-hidden mb-6 md:mb-8">
                <div className="px-5 py-3 border-b border-list-border flex items-center gap-2.5 bg-sidebar-bg/30">
                  <TrendingUp size={14} className="text-sidebar-text" />
                  <h3 className="font-bold text-sidebar-text-active text-xs">Overall Statistics</h3>
                </div>
                <div className="p-5">
                  <StatsPanel stats={allStats} />

                  {/* Platform breakdown */}
                  <div className="mt-5">
                    <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">By Platform</p>
                    <div className="space-y-2">
                      {(['ChatGPT', 'Claude', 'Gemini'] as Platform[]).map((platform) => {
                        const ps = platformStatsMap[platform];
                        if (!ps) return null;
                        return (
                          <div key={platform} className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
                              <div className={cn("w-2 h-2 rounded-full", platformDotColor[platform])} />
                              <span className="text-[11px] font-semibold text-sidebar-text-active">{platform}</span>
                            </div>
                            <div className="flex-1 h-5 bg-list-bg rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent/60 rounded-full transition-all"
                                style={{ width: `${(ps.sessionCount / sessions.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-sidebar-text font-medium w-20 text-right flex-shrink-0">
                              {ps.sessionCount} chats
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy */}
            <div className="bg-white rounded-2xl border border-list-border shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-list-border flex items-center gap-2.5 bg-sidebar-bg/30">
                <Shield size={14} className="text-sidebar-text" />
                <h3 className="font-bold text-sidebar-text-active text-xs">Privacy & Data</h3>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sidebar-text-active text-xs mb-0.5">Local Storage Only</h4>
                    <p className="text-[10px] text-sidebar-text leading-relaxed max-w-sm">All data stays in your browser. Nothing is sent to any server.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-wider">Secure</span>
                </div>
                <div className="pt-4 border-t border-list-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-red-500 text-xs mb-0.5">Clear All Data</h4>
                    <p className="text-[10px] text-sidebar-text leading-relaxed">Permanently delete all imported sessions.</p>
                  </div>
                  <button
                    onClick={() => setIsConfirmOpen(true)}
                    className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-2 w-fit"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <ConfirmModal
              isOpen={isConfirmOpen}
              onClose={() => setIsConfirmOpen(false)}
              onConfirm={onClearData}
              title="Clear Archive?"
              message="Are you sure you want to permanently delete all your chat history? This action cannot be undone and all imported data will be lost."
              confirmText="Delete Everything"
              variant="danger"
            />

            {/* About */}
            <div className="bg-white rounded-2xl border border-list-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-list-border flex items-center gap-2.5 bg-sidebar-bg/30">
                <Info size={14} className="text-sidebar-text" />
                <h3 className="font-bold text-sidebar-text-active text-xs">About</h3>
              </div>
              <div className="p-5">
                <p className="text-[11px] text-sidebar-text leading-relaxed">
                  AI聊天记录查看器 — 多平台AI对话归档工具。
                  支持 ChatGPT、Claude、Gemini 导出文件的导入与浏览。
                  所有数据仅存储在本地浏览器中，不会上传至任何服务器。
                </p>
                <div className="mt-3 pt-3 border-t border-list-border">
                  <p className="text-[10px] text-sidebar-text">
                    <span className="font-semibold">Version 1.0.0</span>
                  </p>
                  <p className="text-[10px] text-sidebar-text mt-1">
                    &copy; 喵星人掉线中 (yueluna)
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Platform tabs */}
        {activeTab !== 'Settings' && (() => {
          const platform = activeTab as Platform;
          const stats = platformStatsMap[platform];
          const profile = assistantProfiles[platform];

          return (
            <>
              {/* Platform profile */}
              <div className="bg-white rounded-2xl border border-list-border shadow-sm p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-2.5 h-2.5 rounded-full", platformDotColor[platform])} />
                  <h3 className="font-bold text-sidebar-text-active text-sm">{platform}</h3>
                </div>
                <div className="flex items-start gap-3">
                  <AvatarUpload
                    value={profile.avatar}
                    onChange={(v) => onUpdateAssistant(platform, { ...profile, avatar: v })}
                  />
                  <div className="flex-1">
                    <EditableField
                      label="Display Name"
                      value={profile.name}
                      onChange={(v) => onUpdateAssistant(platform, { ...profile, name: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Platform stats */}
              {stats ? (
                <div className="bg-white rounded-2xl border border-list-border shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-list-border flex items-center gap-2.5 bg-sidebar-bg/30">
                    <TrendingUp size={14} className="text-sidebar-text" />
                    <h3 className="font-bold text-sidebar-text-active text-xs">{platform} Statistics</h3>
                  </div>
                  <div className="p-5">
                    <StatsPanel stats={stats} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database size={24} className="mx-auto text-sidebar-text mb-3 opacity-40" />
                  <p className="text-xs text-sidebar-text">No {platform} data imported yet</p>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
