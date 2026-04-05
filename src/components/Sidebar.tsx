import React from 'react';
import { MessageSquare, Calendar, Settings, Palette, Image as ImageIcon } from 'lucide-react';
import { cn } from '../App';

interface SidebarProps {
  view: 'chat' | 'calendar' | 'settings' | 'theme' | 'photos';
  setView: (view: 'chat' | 'calendar' | 'settings' | 'theme' | 'photos') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  hideOnMobile?: boolean;
}

export default function Sidebar({ view, setView, isSidebarOpen, setIsSidebarOpen, hideOnMobile }: SidebarProps) {
  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chats' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'photos', icon: ImageIcon, label: 'Gallery' },
    { id: 'theme', icon: Palette, label: 'Theme' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col bg-sidebar-bg border-r border-list-border transition-all duration-300 ease-in-out z-50 pattern-dots",
        isSidebarOpen ? "w-[72px]" : "w-0 overflow-hidden"
      )}>
        <div className="flex flex-col items-center py-5 gap-1.5 h-full">
          {/* Logo */}
          <div className="mb-4 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-list-border shadow-sm flex items-center justify-center text-accent">
              <span className="text-base font-bold italic">CA</span>
            </div>
            <span className="text-[7px] font-semibold tracking-[0.2em] uppercase text-sidebar-text">archive</span>
          </div>

          <div className="w-8 h-px bg-list-border mb-2" />

          <div className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200",
                  view === item.id
                    ? "bg-white text-sidebar-text-active shadow-sm border border-list-border"
                    : "text-sidebar-text hover:bg-white/60 hover:text-sidebar-text-active"
                )}
                title={item.label}
              >
                <item.icon size={16} strokeWidth={2} />
                <span className="text-[8px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 bg-sidebar-bg/95 backdrop-blur-lg border-t border-list-border z-[100] flex items-center justify-around px-1 py-1 transition-transform duration-300",
        hideOnMobile ? "translate-y-full" : "translate-y-0"
      )}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-200 rounded-xl mx-0.5",
              view === item.id
                ? "text-sidebar-text-active bg-white shadow-sm border border-list-border"
                : "text-sidebar-text"
            )}
          >
            <item.icon size={18} strokeWidth={2} />
            <span className="text-[8px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
