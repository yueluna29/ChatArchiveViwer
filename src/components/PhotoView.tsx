import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Session } from '../types';
import { Image as ImageIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import AsyncImage from './AsyncImage';

interface PhotoViewProps {
  sessions: Session[];
  onSelectSession?: (id: string) => void;
}

function LazyPhoto({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? children : <div className="aspect-square bg-list-bg rounded-xl md:rounded-2xl border border-list-border" />}
    </div>
  );
}

const PAGE_SIZE = 60;

export default function PhotoView({ sessions, onSelectSession }: PhotoViewProps) {
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, []);

  const photos = useMemo(() => {
    const all: { imageId: string, sessionId: string, messageId: string, sessionTitle: string, timestamp: number }[] = [];
    sessions.forEach(s => {
      s.messages.forEach(m => {
        m.parts?.forEach(p => {
          if (p.type === 'image') {
            all.push({
              imageId: p.imageId,
              sessionId: s.id,
              messageId: m.id,
              sessionTitle: s.title,
              timestamp: m.timestamp
            });
          }
        });
      });
    });
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions]);

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 h-full bg-list-bg overflow-y-auto pb-16 md:pb-0 custom-scrollbar">
      {/* Header with pattern */}
      <div className="bg-sidebar-bg pattern-grid border-b border-list-border px-6 md:px-12 py-8 md:py-10 sticky top-0 z-10">
        <h2 className="text-xl md:text-2xl font-bold text-sidebar-text-active tracking-tight">Gallery</h2>
        <p className="text-sidebar-text text-xs font-medium mt-1">All images from your conversations</p>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-sidebar-text">
            <div className="w-20 h-20 rounded-2xl bg-sidebar-active/50 flex items-center justify-center mb-5">
              <ImageIcon size={32} className="opacity-50" />
            </div>
            <h3 className="text-sm font-bold text-sidebar-text-active mb-1">No photos yet</h3>
            <p className="text-[11px] text-sidebar-text max-w-xs text-center">
              Images from your imported conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {photos.slice(0, visibleCount).map((photo, idx) => (
              <LazyPhoto key={`${photo.messageId}-${idx}`}>
                <button
                  onClick={() => setLightboxImageId(photo.imageId)}
                  className="group relative aspect-square bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm border border-list-border hover:shadow-md transition-all cursor-pointer w-full"
                >
                  <AsyncImage
                    imageId={photo.imageId}
                    alt="Conversation attachment"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Desktop hover overlay */}
                  <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-end p-3">
                    {onSelectSession && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectSession(photo.sessionId); }}
                        className="text-white text-[10px] font-semibold truncate text-left hover:underline"
                      >
                        {photo.sessionTitle} →
                      </button>
                    )}
                    <div className="flex items-center gap-1 text-white/80 text-[9px] font-medium mt-0.5">
                      <Calendar size={9} />
                      {format(photo.timestamp, 'MMM d, yyyy')}
                    </div>
                  </div>
                </button>
                {/* Mobile: title + date below image */}
                <button
                  className="md:hidden mt-1 px-0.5 text-left w-full"
                  onClick={() => onSelectSession?.(photo.sessionId)}
                >
                  <p className="text-[8px] text-sidebar-text-active font-medium truncate">{photo.sessionTitle}</p>
                  <p className="text-[7px] text-sidebar-text">{format(photo.timestamp, 'MMM d')}</p>
                </button>
              </LazyPhoto>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImageId(null)}
        >
          <div className="absolute inset-0 bg-white/30 backdrop-blur-2xl" />
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <AsyncImage
              imageId={lightboxImageId}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
