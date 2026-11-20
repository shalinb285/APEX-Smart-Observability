import React from 'react';
import { cn } from '../../lib/utils';
import { Database, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  description = 'No telemetry data matches the current filter criteria.',
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[#20293F] bg-[#0A0E18]/60 my-4',
        className
      )}
    >
      <div className="p-3.5 rounded-2xl bg-[#121826] border border-[#222E4A] text-zinc-400 mb-4">
        {icon || <Database className="w-8 h-8 text-zinc-500" />}
      </div>
      <h4 className="text-sm font-semibold font-mono text-zinc-200">{title}</h4>
      <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
