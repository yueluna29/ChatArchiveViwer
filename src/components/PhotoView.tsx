import React, { useMemo } from 'react';
import { Session } from '../types';
import { Image as ImageIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import AsyncImage from './AsyncImage';

interface PhotoViewProps {
  sessions: Session[];
}

export default function PhotoView({ sessions }: PhotoViewProps) {
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
    <div className="flex-1 h-full bg-list-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm border border-slate-100">
            <ImageIcon size={16} className="md:size-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Gallery</h2>
            <p className="text-slate-400 text-[10px] md:text-xs font-medium">All images from your conversations</p>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <ImageIcon size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-2">No photos yet</h3>
            <p className="text-sm text-slate-400 max-w-xs text-center">
              Images from your imported conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {photos.map((photo, idx) => (
              <div key={`${photo.messageId}-${idx}`} className="group relative aspect-square bg-slate-100 rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-all">
                <AsyncImage 
                  imageId={photo.imageId} 
                  alt="Conversation attachment" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 md:p-5">
                  <p className="text-white text-xs md:text-sm font-bold truncate mb-1.5">{photo.sessionTitle}</p>
                  <div className="flex items-center gap-1.5 text-white/80 text-[10px] md:text-xs font-medium">
                    <Calendar size={12} />
                    {format(photo.timestamp, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
