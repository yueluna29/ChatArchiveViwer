import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../App';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string | null;
  type?: NotificationType;
  onClose: () => void;
  duration?: number;
}

export default function Notification({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 5000 
}: NotificationProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
        >
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md",
            type === 'success' ? "bg-emerald-500/90 border-emerald-400 text-white" :
            type === 'error' ? "bg-red-500/90 border-red-400 text-white" :
            "bg-slate-800/90 border-slate-700 text-white"
          )}>
            <div className="flex-shrink-0">
              {type === 'success' && <CheckCircle size={20} />}
              {type === 'error' && <AlertCircle size={20} />}
              {type === 'info' && <Info size={20} />}
            </div>
            <p className="flex-1 text-sm font-medium leading-snug">
              {message}
            </p>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
