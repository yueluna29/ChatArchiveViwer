import React, { useRef, useState, useEffect } from 'react';
import { Check, Upload, X, Type, Minus, Plus } from 'lucide-react';
import { cn } from '../App';
import { saveSetting, getSetting } from '../lib/db';

export type Theme = 'default' | 'blue' | 'yellow' | 'orange' | 'purple' | 'dark';

interface ThemeStudioProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_LINE_HEIGHT = 1.6;

export default function ThemeStudio({ currentTheme, onThemeChange }: ThemeStudioProps) {
  const fontFileRef = useRef<HTMLInputElement>(null);
  const [customFontName, setCustomFontName] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState(DEFAULT_LINE_HEIGHT);

  useEffect(() => {
    // 加载已保存的自定义字体
    getSetting('custom-font').then((data: any) => {
      if (data?.name && data?.dataUrl) {
        setCustomFontName(data.name);
        applyCustomFont(data.dataUrl, data.name);
      }
    });
    // 加载字体大小和行间距
    getSetting('font-size').then((size: any) => {
      if (size) {
        setFontSize(size);
        document.documentElement.style.setProperty('--chat-font-size', `${size}px`);
      }
    });
    getSetting('line-height').then((lh: any) => {
      if (lh) {
        setLineHeight(lh);
        document.documentElement.style.setProperty('--chat-line-height', `${lh}`);
      }
    });
  }, []);

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.min(20, Math.max(12, fontSize + delta));
    setFontSize(newSize);
    document.documentElement.style.setProperty('--chat-font-size', `${newSize}px`);
    saveSetting('font-size', newSize);
  };

  const handleLineHeightChange = (delta: number) => {
    const newLh = Math.min(2.2, Math.max(1.2, Math.round((lineHeight + delta) * 10) / 10));
    setLineHeight(newLh);
    document.documentElement.style.setProperty('--chat-line-height', `${newLh}`);
    saveSetting('line-height', newLh);
  };

  const applyCustomFont = (dataUrl: string, name: string) => {
    // 移除旧的自定义字体 style
    const old = document.getElementById('custom-font-style');
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = 'custom-font-style';
    style.textContent = `
      @font-face {
        font-family: "CustomFont";
        src: url("${dataUrl}");
        font-display: swap;
      }
      :root {
        --font-sans: "CustomFont", "Nunito", "PingFang SC", ui-sans-serif, system-ui, sans-serif;
      }
    `;
    document.head.appendChild(style);
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const name = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
      await saveSetting('custom-font', { name, dataUrl });
      setCustomFontName(name);
      applyCustomFont(dataUrl, name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveFont = async () => {
    await saveSetting('custom-font', null);
    setCustomFontName(null);
    const old = document.getElementById('custom-font-style');
    if (old) old.remove();
  };

  const themes = [
    { id: 'default', name: 'GPT 粉色', bubbleBg: '#ffe7f3', bubbleText: '#77264b', accent: '#D4618C' },
    { id: 'blue', name: 'GPT 蓝色', bubbleBg: '#e5f2ff', bubbleText: '#013566', accent: '#2B6CB0' },
    { id: 'yellow', name: 'GPT 黄色', bubbleBg: '#FFF5D5', bubbleText: '#735200', accent: '#B8860B' },
    { id: 'orange', name: 'Claude 橙色', bubbleBg: '#C96442', bubbleText: '#FAF8F5', accent: '#C96442' },
    { id: 'purple', name: '紫色', bubbleBg: '#BCA2CF', bubbleText: '#F8F4FA', accent: '#9B7DB8' },
    { id: 'dark', name: '黑色', bubbleBg: '#202A30', bubbleText: '#E8ECED', accent: '#4A5A64' },
  ] as const;

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto pb-16 md:pb-0 custom-scrollbar">
      {/* Header */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-12 py-8 md:py-10 sticky top-0 z-10">
        <h2 className="text-xl md:text-2xl font-handwriting text-sidebar-text-active">Theme Studio</h2>
        <p className="text-sidebar-text text-xs font-medium mt-1">Choose your favorite bubble color</p>
      </div>

      <div className="px-6 md:px-12 py-6 md:py-8 max-w-4xl">
        {/* Theme grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
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
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sidebar-text-active text-xs">{theme.name}</span>
                {currentTheme === theme.id && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </div>
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

        {/* Font settings */}
        <div className="bg-white rounded-2xl border border-list-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-list-border flex items-center gap-2.5 bg-sidebar-bg/30">
            <Type size={14} className="text-sidebar-text" />
            <h3 className="font-bold text-sidebar-text-active text-xs">Font</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Font size control */}
            <div>
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">Chat Font Size</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleFontSizeChange(-1)}
                  className="w-8 h-8 flex items-center justify-center bg-list-bg border border-list-border rounded-full hover:bg-sidebar-active transition-colors"
                >
                  <Minus size={12} className="text-sidebar-text-active" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold text-sidebar-text-active">{fontSize}px</span>
                </div>
                <button
                  onClick={() => handleFontSizeChange(1)}
                  className="w-8 h-8 flex items-center justify-center bg-list-bg border border-list-border rounded-full hover:bg-sidebar-active transition-colors"
                >
                  <Plus size={12} className="text-sidebar-text-active" />
                </button>
              </div>
            </div>

            {/* Line height control */}
            <div>
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">Chat Line Height</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLineHeightChange(-0.1)}
                  className="w-8 h-8 flex items-center justify-center bg-list-bg border border-list-border rounded-full hover:bg-sidebar-active transition-colors"
                >
                  <Minus size={12} className="text-sidebar-text-active" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold text-sidebar-text-active">{lineHeight.toFixed(1)}</span>
                </div>
                <button
                  onClick={() => handleLineHeightChange(0.1)}
                  className="w-8 h-8 flex items-center justify-center bg-list-bg border border-list-border rounded-full hover:bg-sidebar-active transition-colors"
                >
                  <Plus size={12} className="text-sidebar-text-active" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-list-bg rounded-xl p-4">
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">Preview</p>
              <p style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}` }} className="text-sidebar-text-active">
                你好世界，这是预览文字。Hello world, this is a preview. こんにちは、プレビューです。
              </p>
            </div>

            <div className="border-t border-list-border pt-4">
              <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest mb-2">Font Family</p>
              <p className="text-[10px] text-sidebar-text mb-1">Default: Nunito + PingFang SC</p>
            </div>

            {customFontName ? (
              <div className="flex items-center justify-between p-3 bg-list-bg rounded-xl">
                <div>
                  <p className="text-[9px] font-semibold text-sidebar-text uppercase tracking-widest">Custom Font</p>
                  <p className="text-xs font-bold text-sidebar-text-active mt-0.5">{customFontName}</p>
                </div>
                <button
                  onClick={handleRemoveFont}
                  className="w-8 h-8 flex items-center justify-center text-sidebar-text hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 bg-list-bg rounded-xl cursor-pointer hover:bg-sidebar-active transition-colors">
                <Upload size={16} className="text-sidebar-text" />
                <div>
                  <p className="text-xs font-semibold text-sidebar-text-active">Upload custom font</p>
                  <p className="text-[9px] text-sidebar-text">.ttf, .otf, .woff, .woff2</p>
                </div>
                <input
                  ref={fontFileRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  onChange={handleFontUpload}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
