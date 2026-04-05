import React from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { cn } from '../App';

export type Theme = 'default' | 'dark' | 'rose' | 'forest';

interface ThemeStudioProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeStudio({ currentTheme, onThemeChange }: ThemeStudioProps) {
  const themes = [
    { id: 'default', name: 'Classic', color: '#6366F1', bg: 'bg-white' },
    { id: 'dark', name: 'Midnight', color: '#3B82F6', bg: 'bg-slate-900' },
    { id: 'rose', name: 'Sakura Pink', color: '#FB7185', bg: 'bg-rose-50' },
    { id: 'forest', name: 'Mint Green', color: '#34D399', bg: 'bg-emerald-50' },
  ] as const;

  return (
    <div className="flex-1 h-full bg-list-bg overflow-y-auto p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center text-accent shadow-sm border border-slate-100">
            <Palette size={20} className="md:size-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Theme Studio</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium">Personalize your archive experience</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id as Theme)}
              className={cn(
                "group relative p-5 md:p-6 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden",
                currentTheme === theme.id 
                  ? "border-accent bg-white shadow-xl scale-[1.02]" 
                  : "border-transparent bg-white/50 hover:bg-white hover:border-slate-200 shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl shadow-inner" 
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="font-bold text-slate-800 text-sm md:text-base">{theme.name}</span>
                </div>
                {currentTheme === theme.id && (
                  <div className="w-5 h-5 md:w-6 md:h-6 bg-accent text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <Check size={12} className="md:size-14" />
                  </div>
                )}
              </div>

              {/* Preview Mockup */}
              <div className={cn("rounded-xl border border-slate-100 p-2 md:p-3 flex gap-2", theme.bg)}>
                <div className="w-1/3 space-y-1.5 md:space-y-2">
                  <div className="h-1.5 md:h-2 w-full bg-slate-200 rounded-full opacity-50" />
                  <div className="h-1.5 md:h-2 w-3/4 bg-slate-200 rounded-full opacity-50" />
                  <div className="h-1.5 md:h-2 w-1/2 bg-slate-200 rounded-full opacity-50" />
                </div>
                <div className="flex-1 space-y-1.5 md:space-y-2">
                  <div className="h-6 md:h-8 w-full rounded-lg" style={{ backgroundColor: theme.color, opacity: 0.1 }} />
                  <div className="h-6 md:h-8 w-full bg-slate-100 rounded-lg" />
                </div>
              </div>

              {currentTheme === theme.id && (
                <div className="absolute -right-4 -bottom-4 text-accent/5 rotate-12">
                  <Sparkles size={80} className="md:size-120" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 md:mt-12 p-6 md:p-8 bg-accent/5 rounded-3xl border border-accent/10">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent/10 rounded-lg text-accent flex-shrink-0">
              <Sparkles size={18} className="md:size-20" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1 md:mb-2 text-sm md:text-base">More themes coming soon</h4>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                We're working on a custom theme builder where you can pick your own colors and fonts. 
                Stay tuned for future updates!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
