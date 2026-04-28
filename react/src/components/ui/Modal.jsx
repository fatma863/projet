import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Modal({ open, onClose, title, children, footer, className, size = 'md' }) {
  const overlayRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  const body = typeof children === 'function' ? children({ scrollRef }) : children;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={cn(
          'relative flex w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl',
          'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]',
          'animate-in fade-in-0 zoom-in-[0.98] slide-in-from-bottom-2 duration-200',
          sizes[size],
          className,
        )}
      >
        {/* ── Fixed header — always visible, never scrolls ── */}
        {title && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>
        )}

        {/* ── Scrollable body — only this region scrolls ── */}
        <div
          ref={scrollRef}
          data-modal-scroll
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5"
        >
          {body}
        </div>

        {/* ── Fixed footer — always visible, never scrolls ── */}
        {footer && (
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-3 sm:px-6 sm:py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
