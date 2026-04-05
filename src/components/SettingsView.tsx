import React, { useState, useRef } from 'react';
import {
  Trash2,
  Shield,
  Info,
  FileText,
  BarChart3,
  User,
  Database,
  Upload,
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

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-list-bg border border-list-border rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-white"
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
        className="w-12 h-12 rounded-xl bg-list-bg border border-list-border overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-accent transition-all group relative"
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

function ProfileCard({ label, dotColor, avatar, name, onAvatarChange, onNameChange }: {
  label: string; dotColor: string; avatar: string; name: string;
  onAvatarChange: (v: string) => void; onNameChange: (v: string) => void;
}) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-list-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-2 h-2 rounded-full", dotColor)} />
        <h3 className="font-bold text-sidebar-text-active text-xs">{label}</h3>
      </div>
      <div className="flex items-start gap-2.5">
        <AvatarUpload value={avatar} onChange={onAvatarChange} />
        <div className="flex-1">
          <EditableField label="Name" value={name} onChange={onNameChange} />
        </div>
      </div>
    </div>
  );
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

        {/* Profiles — 2 columns */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Left column: User + ChatGPT */}
          <div className="space-y-3 md:space-y-4">
            <ProfileCard
              label="Your Profile" dotColor="bg-purple-400"
              avatar={userProfile.avatar} name={userProfile.name}
              onAvatarChange={(v) => onUpdateUser({ ...userProfile, avatar: v })}
              onNameChange={(v) => onUpdateUser({ ...userProfile, name: v })}
            />
            <ProfileCard
              label="ChatGPT" dotColor="bg-emerald-400"
              avatar={assistantProfiles.ChatGPT.avatar} name={assistantProfiles.ChatGPT.name}
              onAvatarChange={(v) => onUpdateAssistant('ChatGPT', { ...assistantProfiles.ChatGPT, avatar: v })}
              onNameChange={(v) => onUpdateAssistant('ChatGPT', { ...assistantProfiles.ChatGPT, name: v })}
            />
          </div>
          {/* Right column: Claude + Gemini */}
          <div className="space-y-3 md:space-y-4">
            <ProfileCard
              label="Claude" dotColor="bg-orange-400"
              avatar={assistantProfiles.Claude.avatar} name={assistantProfiles.Claude.name}
              onAvatarChange={(v) => onUpdateAssistant('Claude', { ...assistantProfiles.Claude, avatar: v })}
              onNameChange={(v) => onUpdateAssistant('Claude', { ...assistantProfiles.Claude, name: v })}
            />
            <ProfileCard
              label="Gemini" dotColor="bg-blue-400"
              avatar={assistantProfiles.Gemini.avatar} name={assistantProfiles.Gemini.name}
              onAvatarChange={(v) => onUpdateAssistant('Gemini', { ...assistantProfiles.Gemini, avatar: v })}
              onNameChange={(v) => onUpdateAssistant('Gemini', { ...assistantProfiles.Gemini, name: v })}
            />
          </div>
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
      </div>
    </div>
  );
}
