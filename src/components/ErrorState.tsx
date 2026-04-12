import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
  className
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] px-6 py-10 text-center',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-error)]/15 text-[var(--color-error)]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
