import React from 'react';
import { Palette, Check } from 'lucide-react';
import { cn } from '../App';

export type Theme = 'default' | 'blue' | 'yellow' | 'green' | 'orange';

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
            <p className="text-slate-400 text-xs md:text-sm font-medium">选择你喜欢的气泡配色</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id as Theme)}
              className={cn(
                "group relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 text-left",
                currentTheme === theme.id
                  ? "border-accent bg-white shadow-lg scale-[1.02]"
                  : "border-transparent bg-white/50 hover:bg-white hover:border-slate-200 shadow-sm"
              )}
            >
              {/* 主题名称 + 选中标记 */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-700 text-sm">{theme.name}</span>
                {currentTheme === theme.id && (
                  <div className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </div>

              {/* 气泡预览 */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2.5">
                {/* 用户气泡 */}
                <div className="flex justify-end">
                  <div
                    className="px-3 py-1.5 rounded-2xl rounded-tr-none text-xs font-medium max-w-[75%]"
                    style={{ backgroundColor: theme.bubbleBg, color: theme.bubbleText }}
                  >
                    你好呀～
                  </div>
                </div>
                {/* 助手气泡 */}
                <div className="flex justify-start">
                  <div className="px-3 py-1.5 rounded-2xl rounded-tl-none text-xs font-medium text-slate-600 bg-white border border-slate-100 max-w-[75%]">
                    你好！有什么可以帮你的？
                  </div>
                </div>
                {/* 用户气泡 */}
                <div className="flex justify-end">
                  <div
                    className="px-3 py-1.5 rounded-2xl rounded-tr-none text-xs font-medium max-w-[75%]"
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
