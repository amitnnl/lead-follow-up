import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Active modals counter to manage body scroll lock across multiple/nested modals
let activeModalsCount = 0;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  className?: string; 
  backdropClassName?: string;
  zClassName?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  closeOnOutsideClick = true,
  closeOnEsc = true,
  className = "w-full max-w-3xl max-h-[96vh] bg-white dark:bg-[#162230] rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col my-auto overflow-hidden",
  backdropClassName = "absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs",
  zClassName = "z-[9999]"
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalsCount++;
    if (activeModalsCount === 1) {
      // Lock scroll and prevent page shifting
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      activeModalsCount--;
      if (activeModalsCount <= 0) {
        activeModalsCount = 0;
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  // If the caller customized the layout by passing a zClassName with flex styles, use that.
  // Otherwise, automatically apply default centering and flex classes.
  const hasFlex = zClassName.includes('flex');
  const containerClasses = hasFlex
    ? `fixed inset-0 ${zClassName}`
    : `fixed inset-0 ${zClassName} flex items-center justify-center p-2 sm:p-4 overflow-y-auto select-none`;

  const content = (
    <div className={containerClasses}>
      {/* Backdrop */}
      <div 
        className={backdropClassName} 
        onClick={(e) => {
          if (closeOnOutsideClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      
      {/* Modal Container */}
      <div className={`${className} relative z-10 animate-in fade-in zoom-in-95 duration-200`}>
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
