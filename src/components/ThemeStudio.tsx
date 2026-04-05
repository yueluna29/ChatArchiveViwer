import React from 'react';
import { Palette, Check } from 'lucide-react';
import { cn } from '../App';

export type Theme = 'default' | 'blue' | 'yellow' | 'green' | 'orange' | 'purple';

interface ThemeStudioProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeStudio({ currentTheme, onThemeChange }: ThemeStudioProps) {
  const themes = [
    { id: 'default', name: 'GPT 粉色', bubbleBg: '#ffe7f3', bubbleText: '#77264b', accent: '#D4618C' },
    { id: 'blue', name: 'GPT 蓝色', bubbleBg: '#e5f2ff', bubbleText: '#013566', accent: '#2B6CB0' },
    { id: 'yellow', name: 'GPT 黄色', bubbleBg: '#FFF5D5', bubbleText: '#735200', accent: '#B8860B' },
    { id: 'green', name: 'GPT 绿色', bubbleBg: '#D8F3E4', bubbleText: '#004F1F', accent: '#1A7A3D' },
    { id: 'orange', name: 'Claude 橙色', bubbleBg: '#C96442', bubbleText: '#FAF8F5', accent: '#C96442' },
    { id: 'purple', name: '紫色', bubbleBg: '#BCA2CF', bubbleText: '#F8F4FA', accent: '#9B7DB8' },
  ] as const;

  return (
    <div className="flex-1 h-full bg-list-bg overflow-y-auto custom-scrollbar">
      {/* Header with pattern */}
      <div className="bg-sidebar-bg pattern-dots border-b border-list-border px-6 md:px-12 py-8 md:py-10">
        <h2 className="text-xl md:text-2xl font-bold text-sidebar-text-active tracking-tight">Theme Studio</h2>
        <p className="text-sidebar-text text-xs font-medium mt-1">Choose your favorite bubble color</p>
      </div>

      <div className="px-6 md:px-12 py-6 md:py-8 max-w-4xl">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id as Theme)}
              className={cn(
                "group relative p-4 rounded-2xl border transition-all duration-300 text-left",
                currentTheme === theme.id
                  ? "border-accent bg-white shadow-md"
                  : "border-list-border bg-white/60 hover:bg-white hover:shadow-sm"
              )}
            >
              {/* 主题名称 + 选中标记 */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sidebar-text-active text-xs">{theme.name}</span>
                {currentTheme === theme.id && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </div>

              {/* 气泡预览 */}
              <div className="bg-list-bg rounded-xl p-3 space-y-2 border border-list-border">
                <div className="flex justify-end">
                  <div
                    className="px-2.5 py-1 rounded-xl rounded-tr-none text-[10px] font-medium"
                    style={{ backgroundColor: theme.bubbleBg, color: theme.bubbleText }}
                  >
                    你好呀～
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="px-2.5 py-1 rounded-xl rounded-tl-none text-[10px] font-medium text-slate-600 bg-white border border-list-border">
                    你好！
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    className="px-2.5 py-1 rounded-xl rounded-tr-none text-[10px] font-medium"
                    style={{ backgroundColor: theme.bubbleBg, color: theme.bubbleText }}
                  >
                    这个颜色好看吗？
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
