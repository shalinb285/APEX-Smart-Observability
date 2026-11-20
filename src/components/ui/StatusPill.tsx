import React from 'react';
import { cn, getStatusColor, getStatusDot } from '../../lib/utils';
import { HealthStatus } from '../../types';

interface StatusPillProps {
  status: HealthStatus | string;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className,
  showDot = true,
}) => {
  const displayLabel = label || status.toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border uppercase tracking-wider',
        getStatusColor(status),
        className
      )}
    >
      {showDot && (
        <span className={cn('w-2 h-2 rounded-full inline-block', getStatusDot(status))} />
      )}
      {displayLabel}
    </span>
  );
};
