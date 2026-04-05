import React from 'react';
import { MessageSquare, Calendar, Settings, History, Palette, Image as ImageIcon } from 'lucide-react';
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
    { id: 'chat', icon: MessageSquare, label: 'Conversations' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'photos', icon: ImageIcon, label: 'Gallery' },
    { id: 'theme', icon: Palette, label: 'Theme Studio' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col bg-sidebar-bg transition-all duration-300 ease-in-out z-50",
        isSidebarOpen ? "w-16" : "w-0 overflow-hidden"
      )}>
        <div className="flex flex-col items-center py-6 gap-6 h-full">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white mb-2 shadow-sm">
            <History size={18} strokeWidth={2.5} />
          </div>
          
          <div className="flex flex-col gap-3 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  view === item.id 
                    ? "bg-sidebar-active text-sidebar-text-active shadow-md" 
                    : "text-sidebar-text hover:bg-sidebar-active hover:text-sidebar-text-active"
                )}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={2.5} />
              </button>
            ))}
          </div>

          <div className="mt-auto pb-4">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
               YA
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 h-14 bg-sidebar-bg border-t border-sidebar-active z-[100] flex items-center justify-around px-2 transition-transform duration-300",
        hideOnMobile ? "translate-y-full" : "translate-y-0"
      )}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center transition-all duration-200 h-full",
              view === item.id ? "text-sidebar-text-active" : "text-sidebar-text"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              view === item.id ? "bg-sidebar-active shadow-md" : ""
            )}>
              <item.icon size={20} strokeWidth={2.5} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
