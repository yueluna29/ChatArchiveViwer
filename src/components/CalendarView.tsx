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
    <div className="flex-1 h-full bg-list-bg overflow-y-auto pb-16 md:pb-0 custom-scrollbar">
      {/* Header with pattern */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-12 py-8 md:py-10 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-sidebar-text-active tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-sidebar-text text-xs font-medium mt-1">Browse history by date</p>
          </div>
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-list-border shadow-sm">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-sidebar-text-active">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => { const t = new Date(); setCurrentMonth(t); setSelectedDay(t); }}
              className="px-2 py-0.5 text-[9px] font-bold text-sidebar-text hover:text-accent transition-all uppercase tracking-wider"
            >
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-sidebar-text-active">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        {/* Calendar Grid */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-list-border shadow-sm">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[9px] font-bold text-sidebar-text uppercase tracking-widest mb-2">
                {day}
              </div>
            ))}

            {days.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay[dayStr] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const platforms = Array.from(new Set(daySessions.map(s => s.platform)));

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "aspect-square p-1 md:p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-between",
                    isCurrentMonth ? "border-transparent" : "opacity-25",
                    isSelected ? "border-accent bg-sidebar-active" : "hover:bg-sidebar-bg",
                    isToday && !isSelected && "border-accent/30"
                  )}
                >
                  <span className={cn(
                    "text-[10px] md:text-sm font-bold",
                    isSelected ? "text-accent" : isToday ? "text-accent/60" : "text-sidebar-text-active/70"
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {platforms.map(p => (
                      <div key={p} className={cn("w-1 h-1 md:w-1.5 md:h-1.5 rounded-full",
                        p === 'ChatGPT' ? 'bg-emerald-400' : p === 'Claude' ? 'bg-orange-400' : 'bg-blue-400'
                      )} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-sidebar-text-active">
              {format(selectedDay, 'MMMM d, yyyy')}
            </h3>
            <span className="text-[9px] font-semibold text-sidebar-text bg-sidebar-active px-2 py-0.5 rounded-full">
              {selectedDaySessions.length} sessions
            </span>
          </div>

          {selectedDaySessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedDaySessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-list-border hover:shadow-sm transition-all text-left group"
                >
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                    s.platform === 'ChatGPT' ? 'bg-emerald-400' : s.platform === 'Claude' ? 'bg-orange-400' : 'bg-blue-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-sidebar-text-active truncate group-hover:text-accent transition-colors">
                      {s.title}
                    </p>
                    <span className="text-[9px] text-sidebar-text">
                      {s.platform} · {format(s.updateTime, 'HH:mm')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-list-border border-dashed rounded-2xl p-10 text-center">
              <CalendarIcon size={20} className="mx-auto text-sidebar-text opacity-40 mb-2" />
              <p className="text-xs font-medium text-sidebar-text">No chats on this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
