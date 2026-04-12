import { cn } from '../lib/cn';

interface TypingIndicatorProps {
  label?: string;
  className?: string;
}

export function TypingIndicator({ label = 'Thinking', className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]',
        className
      )}
      aria-live="polite"
    >
      <span className="flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      {label ? <span>{label}…</span> : null}
    </div>
  );
}
