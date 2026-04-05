import React, { useState } from 'react';
import {
  Trash2,
  Shield,
  Info,
  FileText,
  BarChart3,
  User,
  Bot,
  Database,
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
    { label: 'Sessions', value: sessions.length, icon: FileText },
    { label: 'Messages', value: sessions.reduce((acc, s) => acc + s.messages.length, 0), icon: BarChart3 },
    { label: 'Platforms', value: new Set(sessions.map(s => s.platform)).size, icon: Database },
  ];

  return (
    <div className="flex-1 h-full bg-list-bg overflow-y-auto custom-scrollbar">
      {/* Header with pattern */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-12 py-8 md:py-10">
        <h2 className="text-xl md:text-2xl font-bold text-sidebar-text-active tracking-tight">Settings</h2>
        <p className="text-sidebar-text text-xs font-medium mt-1">Manage your archive</p>
      </div>

      <div className="px-6 md:px-12 py-6 md:py-8 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl border border-list-border shadow-sm text-center">
              <stat.icon size={16} className="mx-auto text-accent mb-2 opacity-60" />
              <p className="text-lg md:text-xl font-bold text-sidebar-text-active">{stat.value}</p>
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-list-border shadow-sm mb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-sidebar-active rounded-lg text-accent">
              <User size={14} />
            </div>
            <h3 className="font-bold text-sidebar-text-active text-sm">Your Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">Name</label>
              <input
                type="text"
                value={userProfile.name}
                onChange={(e) => onUpdateUser({ ...userProfile, name: e.target.value })}
                className="w-full px-3 py-2 bg-list-bg border border-list-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">Avatar URL</label>
              <input
                type="text"
                value={userProfile.avatar}
                onChange={(e) => onUpdateUser({ ...userProfile, avatar: e.target.value })}
                className="w-full px-3 py-2 bg-list-bg border border-list-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Assistant Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {(['ChatGPT', 'Claude', 'Gemini'] as Platform[]).map((platform) => (
            <div key={platform} className="bg-white p-4 md:p-5 rounded-2xl border border-list-border shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  platform === 'ChatGPT' ? "bg-emerald-400" :
                  platform === 'Claude' ? "bg-orange-400" : "bg-blue-400"
                )} />
                <h3 className="font-bold text-sidebar-text-active text-xs">{platform}</h3>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">Name</label>
                  <input
                    type="text"
                    value={assistantProfiles[platform].name}
                    onChange={(e) => onUpdateAssistant(platform, { ...assistantProfiles[platform], name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-list-bg border border-list-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">Avatar</label>
                  <input
                    type="text"
                    value={assistantProfiles[platform].avatar}
                    onChange={(e) => onUpdateAssistant(platform, { ...assistantProfiles[platform], avatar: e.target.value })}
                    className="w-full px-3 py-1.5 bg-list-bg border border-list-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

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
              ChatArchive helps you keep a permanent, searchable record of your AI conversations.
              Supports ChatGPT, Claude, and Gemini exports.
            </p>
            <p className="text-[10px] text-sidebar-text mt-2 font-semibold">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
