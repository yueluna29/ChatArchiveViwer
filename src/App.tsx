/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Settings, 
  Search, 
  Plus, 
  Folder as FolderIcon, 
  Trash2, 
  Download, 
  ChevronRight, 
  Menu, 
  X,
  History,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session, Folder, Platform, AppState } from './types';
import { getAllSessions, getAllFolders, saveSession, deleteSession, clearAllData } from './lib/db';
import { parseFile } from './lib/parser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import Sidebar from './components/Sidebar';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import ThemeStudio, { Theme } from './components/ThemeStudio';
import Notification, { NotificationType } from './components/Notification';
import PhotoView from './components/PhotoView';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All');
  const [view, setView] = useState<'chat' | 'calendar' | 'settings' | 'theme' | 'photos'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('default');
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [userProfile, setUserProfile] = useState({
    name: 'You',
    avatar: ''
  });
  const [assistantProfiles, setAssistantProfiles] = useState<Record<Platform, { name: string; avatar: string }>>({
    ChatGPT: { name: 'ChatGPT', avatar: '' },
    Claude: { name: 'Claude', avatar: '' },
    Gemini: { name: 'Gemini', avatar: '' },
  });

  useEffect(() => {
    loadData();
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Load profiles
    const savedUser = localStorage.getItem('user-profile');
    if (savedUser) setUserProfile(JSON.parse(savedUser));
    const savedAssistants = localStorage.getItem('assistant-profiles');
    if (savedAssistants) setAssistantProfiles(JSON.parse(savedAssistants));
  }, []);

  const handleUpdateUserProfile = (profile: typeof userProfile) => {
    setUserProfile(profile);
    localStorage.setItem('user-profile', JSON.stringify(profile));
  };

  const handleUpdateAssistantProfile = (platform: Platform, profile: { name: string; avatar: string }) => {
    const newProfiles = { ...assistantProfiles, [platform]: profile };
    setAssistantProfiles(newProfiles);
    localStorage.setItem('assistant-profiles', JSON.stringify(newProfiles));
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const loadData = async () => {
    const s = await getAllSessions();
    const f = await getAllFolders();
    setSessions(s.sort((a, b) => b.updateTime - a.updateTime));
    setFolders(f);
  };

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const newSessions = await parseFile(file);
      for (const s of newSessions) {
        await saveSession(s);
      }
      await loadData();
      showNotification(`Successfully imported ${newSessions.length} sessions`, 'success');
    } catch (err) {
      console.error('Import failed:', err);
      showNotification('Import failed: ' + (err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPlatform = platformFilter === 'All' || s.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    }).sort((a, b) => {
      const getTime = (s: Session) => {
        const valid = s.messages.filter(m =>
          (m.role === 'user' || m.role === 'assistant') && (m.content?.trim() || (m.parts && m.parts.length > 0))
        );
        const last = valid.length > 0 ? valid[valid.length - 1] : s.messages[s.messages.length - 1];
        return last?.timestamp || s.updateTime || s.createTime;
      };
      return getTime(b) - getTime(a);
    });
  }, [sessions, searchQuery, platformFilter]);

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId), 
  [sessions, activeSessionId]);

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id);
      await loadData();
      setActiveSessionId(null);
      showNotification('Session deleted successfully', 'success');
    } catch (err) {
      showNotification('Failed to delete session', 'error');
    }
  };

  return (
    <div className="flex h-screen w-full bg-list-bg overflow-hidden">
      {/* Sidebar - Navigation */}
      <Sidebar
        view={view}
        setView={setView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        hideOnMobile={view === 'chat' && !!activeSessionId}
        userAvatar={userProfile.avatar}
      />

      {/* Main Content Area */}
      <div className={cn(
        "flex flex-1 overflow-hidden relative bg-sidebar-bg transition-all duration-300",
        (view === 'chat' && !!activeSessionId) ? "pb-0" : "pb-14 md:pb-0"
      )}>
        {view === 'chat' && (
          <>
            {/* Session List - Hidden on mobile if a session is active */}
            <div className={cn(
              "absolute inset-0 z-20 bg-list-bg transition-transform duration-300 md:relative md:translate-x-0 md:z-0 md:w-80",
              activeSessionId && "translate-x-[-100%] md:translate-x-0"
            )}>
              <SessionList
                sessions={filteredSessions}
                activeSessionId={activeSessionId}
                setActiveSessionId={setActiveSessionId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                platformFilter={platformFilter}
                setPlatformFilter={setPlatformFilter}
                handleImport={handleImport}
                isLoading={isLoading}
                userProfile={userProfile}
              />
            </div>

            {/* Chat View - Full screen on mobile if active */}
            <div className={cn(
              "flex-1 min-w-0 bg-chat-bg relative transition-transform duration-300",
              !activeSessionId && "translate-x-full md:translate-x-0"
            )}>
              {activeSession ? (
                <ChatView
                  session={activeSession}
                  onBack={() => setActiveSessionId(null)}
                  onDelete={handleDeleteSession}
                  onUpdateTitle={async (id, title) => {
                    const s = sessions.find(s => s.id === id);
                    if (s) {
                      s.title = title;
                      await saveSession(s);
                      await loadData();
                    }
                  }}
                  userProfile={userProfile}
                  assistantProfile={assistantProfiles[activeSession.platform]}
                />
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-full p-8 text-center pattern-dots bg-list-bg">
                  <div className="bg-white rounded-3xl border border-list-border shadow-sm p-10 flex flex-col items-center max-w-xs">
                    <div className="w-16 h-16 rounded-2xl bg-sidebar-bg border border-list-border flex items-center justify-center mb-5">
                      <MessageSquare size={24} className="text-sidebar-text" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-sm font-bold text-sidebar-text-active mb-1.5">Select a session</h3>
                    <p className="text-[11px] text-sidebar-text leading-relaxed">
                      Choose a conversation from the list, or click + to import an archive.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'calendar' && <CalendarView sessions={sessions} onSelectSession={(id) => {
          setActiveSessionId(id);
          setView('chat');
        }} />}

        {view === 'photos' && <PhotoView sessions={sessions} onSelectSession={(id) => {
          setActiveSessionId(id);
          setView('chat');
        }} />}

        {view === 'theme' && <ThemeStudio currentTheme={theme} onThemeChange={handleThemeChange} />}

        {view === 'settings' && <SettingsView 
          sessions={sessions} 
          userProfile={userProfile}
          assistantProfiles={assistantProfiles}
          onUpdateUser={handleUpdateUserProfile}
          onUpdateAssistant={handleUpdateAssistantProfile}
          onClearData={async () => {
            try {
              await clearAllData();
              await loadData();
              setActiveSessionId(null);
              showNotification('Archive cleared successfully', 'success');
            } catch (err) {
              showNotification('Failed to clear archive', 'error');
            }
          }} 
        />}
      </div>

      <Notification 
        message={notification?.message || null}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
