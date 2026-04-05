import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths
} from 'date-fns';
import { 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Session, Platform } from '../types';
import { cn } from '../App';

interface CalendarViewProps {
  sessions: Session[];
  onSelectSession: (id: string) => void;
}

export default function CalendarView({ sessions, onSelectSession }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach(s => {
      const day = format(s.updateTime, 'yyyy-MM-dd');
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessions]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDayStr = format(selectedDay, 'yyyy-MM-dd');
  const selectedDaySessions = sessionsByDay[selectedDayStr] || [];

  return (
    <div className="flex-1 h-full bg-list-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <CalendarIcon size={20} className="md:size-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <p className="text-slate-400 text-[10px] md:text-xs font-medium">Browse history by date</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg">
            <button 
              onClick={prevMonth}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                setSelectedDay(today);
              }}
              className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:text-accent transition-all uppercase tracking-wider"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-4">
                {day}
              </div>
            ))}
            
            {days.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay[dayStr] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);

              // Get unique platforms for this day
              const platforms = Array.from(new Set(daySessions.map(s => s.platform)));

              return (
                <button 
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "aspect-square p-1 md:p-2 rounded-xl md:rounded-2xl border transition-all duration-200 flex flex-col items-center justify-between group relative",
                    isCurrentMonth ? "bg-white border-slate-50" : "bg-slate-50/30 border-transparent opacity-30",
                    isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "hover:border-slate-200 hover:bg-slate-50",
                    isToday && !isSelected && "border-accent/30"
                  )}
                >
                  <span className={cn(
                    "text-[10px] md:text-sm font-bold",
                    isSelected ? "text-accent" : isToday ? "text-accent/60" : "text-slate-500"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 max-w-full">
                    {platforms.map(p => (
                      <PlatformDot key={p} platform={p} size="small" />
                    ))}
                  </div>

                  {isToday && !isSelected && (
                    <div className="absolute top-1 right-1 w-1 h-1 bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm md:text-base font-bold text-slate-700">
              {format(selectedDay, 'MMMM d, yyyy')}
            </h3>
            <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              {selectedDaySessions.length} Sessions
            </span>
          </div>

          {selectedDaySessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDaySessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-accent hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <PlatformDot platform={s.platform} size="large" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {s.platform}
                      </span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9px] text-slate-400">
                        {format(s.updateTime, 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 truncate group-hover:text-accent transition-colors">
                      {s.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <CalendarIcon size={24} />
              </div>
              <p className="text-sm font-bold text-slate-400">No chat history for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformDot({ platform, size = 'small' }: { platform: Platform, size?: 'small' | 'large' }) {
  const sizeClass = size === 'small' ? 'w-1 h-1 md:w-1.5 md:h-1.5' : 'w-2 h-2 md:w-3 md:h-3';
  
  switch (platform) {
    case 'ChatGPT': return <div className={cn("rounded-full bg-emerald-500 shadow-sm", sizeClass)} />;
    case 'Claude': return <div className={cn("rounded-full bg-orange-500 shadow-sm", sizeClass)} />;
    case 'Gemini': return <div className={cn("rounded-full bg-blue-500 shadow-sm", sizeClass)} />;
    default: return <div className={cn("rounded-full bg-slate-400 shadow-sm", sizeClass)} />;
  }
}
