import React, { useState } from 'react';
import { 
  Trash2, 
  Database, 
  Shield, 
  Info,
  AlertCircle,
  FileText,
  BarChart3,
  User,
  Bot,
  Settings as SettingsIcon
} from 'lucide-react';
import { Session, Platform } from '../types';
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

export default function SettingsView({ 
  sessions, 
  userProfile, 
  assistantProfiles, 
  onUpdateUser, 
  onUpdateAssistant, 
  onClearData 
}: SettingsViewProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const stats = [
    { label: 'Total Sessions', value: sessions.length, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Messages', value: sessions.reduce((acc, s) => acc + s.messages.length, 0), icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Platforms', value: new Set(sessions.map(s => s.platform)).size, icon: Database, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="flex-1 h-full bg-list-bg overflow-y-auto p-6 md:p-12 custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm border border-slate-100">
            <SettingsIcon size={16} className="md:size-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Settings</h2>
            <p className="text-slate-400 text-[10px] md:text-xs font-medium">Manage your archive and preferences</p>
          </div>
        </div>

        {/* Identity Customization */}
        <div className="space-y-6 mb-8 md:mb-12">
          {/* User Profile */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                <User size={18} className="md:size-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">User Profile</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Display Name</label>
                <input 
                  type="text" 
                  value={userProfile.name}
                  onChange={(e) => onUpdateUser({ ...userProfile, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Avatar URL</label>
                <input 
                  type="text" 
                  value={userProfile.avatar}
                  onChange={(e) => onUpdateUser({ ...userProfile, avatar: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Assistant Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {(['ChatGPT', 'Claude', 'Gemini'] as Platform[]).map((platform) => (
              <div key={platform} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    platform === 'ChatGPT' ? "bg-emerald-50 text-emerald-500" :
                    platform === 'Claude' ? "bg-orange-50 text-orange-500" :
                    "bg-blue-50 text-blue-500"
                  )}>
                    <Bot size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{platform} Profile</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
                    <input 
                      type="text" 
                      value={assistantProfiles[platform].name}
                      onChange={(e) => onUpdateAssistant(platform, { ...assistantProfiles[platform], name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      placeholder={`${platform} name`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Avatar URL</label>
                    <input 
                      type="text" 
                      value={assistantProfiles[platform].avatar}
                      onChange={(e) => onUpdateAssistant(platform, { ...assistantProfiles[platform], avatar: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 md:gap-4">
              <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={18} className="md:size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 md:space-y-6">
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-50 flex items-center gap-3">
              <Shield size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Privacy & Data</h3>
            </div>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1 text-sm md:text-base">Local Storage Only</h4>
                  <p className="text-xs md:text-sm text-slate-400 max-w-md">All your chat history is stored locally in your browser's IndexedDB. No data is ever sent to a server.</p>
                </div>
                <div className="w-fit px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Secure
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between pt-6 md:pt-8 border-t border-slate-50 gap-4">
                <div>
                  <h4 className="font-semibold text-red-600 mb-1 text-sm md:text-base">Clear All Data</h4>
                  <p className="text-xs md:text-sm text-slate-400 max-w-md">Permanently delete all imported sessions and folders from this browser. This action cannot be undone.</p>
                </div>
                <button 
                  onClick={() => setIsConfirmOpen(true)}
                  className="w-full md:w-auto px-6 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Clear Archive
                </button>
              </div>
            </div>
          </section>

          <ConfirmModal 
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={onClearData}
            title="Clear Archive?"
            message="Are you sure you want to permanently delete all your chat history? This action cannot be undone and all imported data will be lost."
            confirmText="Delete Everything"
            variant="danger"
          />

          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-50 flex items-center gap-3">
              <Info size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-800 text-sm md:text-base">About ChatArchive</h3>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4 p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <AlertCircle size={20} className="text-accent mt-1 flex-shrink-0" />
                <div className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  ChatArchive is a tool designed to help you keep a permanent, searchable record of your AI conversations. 
                  It supports exports from major platforms like ChatGPT, Claude, and Gemini. 
                  <br /><br />
                  <span className="font-bold">Version 1.0.0</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
