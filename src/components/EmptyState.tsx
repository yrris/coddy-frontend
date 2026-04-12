import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 px-6 py-14 text-center',
        className
      )}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-glow)] text-[var(--color-primary-hover)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
