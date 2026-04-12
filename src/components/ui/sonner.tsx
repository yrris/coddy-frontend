import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast !bg-[var(--color-surface)] !border !border-[var(--color-border)] !text-[var(--color-text)] !rounded-[var(--radius-md)] !shadow-[var(--shadow-lg)]',
          description: '!text-[var(--color-text-secondary)]',
          actionButton: '!bg-[var(--color-primary)] !text-white',
          cancelButton: '!bg-[var(--color-surface-alt)] !text-[var(--color-text-secondary)]'
        }
      }}
    />
  );
}
