import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../App';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          {/* Frosted glass backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/40 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-list-border overflow-hidden"
          >
            {/* Pattern header */}
            <div className="pattern-dots bg-sidebar-bg px-6 pt-6 pb-4 flex items-start justify-between">
              <div className="text-2xl">
                {variant === 'danger' ? '🗑' : variant === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-sidebar-text hover:text-sidebar-text-active transition-colors rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pb-6 pt-3">
              <h3 className="text-base font-bold text-sidebar-text-active mb-1.5">{title}</h3>
              <p className="text-sidebar-text text-xs leading-relaxed mb-6">
                {message}
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-list-bg text-sidebar-text hover:text-sidebar-text-active border border-list-border rounded-xl font-semibold text-xs transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all",
                    variant === 'danger' ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500" :
                    variant === 'warning' ? "bg-orange-50 text-orange-500 border border-orange-100 hover:bg-orange-500 hover:text-white hover:border-orange-500" :
                    "bg-sidebar-active text-accent border border-list-border hover:bg-accent hover:text-white hover:border-accent"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
