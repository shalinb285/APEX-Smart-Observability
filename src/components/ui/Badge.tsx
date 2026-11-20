import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'healthy' | 'warning' | 'critical' | 'purple' | 'cyan' | 'blue' | 'outline';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  dot = false,
  ...props
}) => {
  // Strictly Black & White Monochrome Variations
  const variantStyles = {
    default: 'bg-zinc-900 text-zinc-300 border-zinc-700',
    healthy: 'bg-zinc-950 text-zinc-100 border-zinc-700',
    warning: 'bg-zinc-900 text-zinc-200 border-zinc-600 border-dashed',
    critical: 'bg-white text-black font-bold border-white',
    purple: 'bg-zinc-900 text-zinc-200 border-zinc-700',
    cyan: 'bg-zinc-800 text-white border-zinc-600',
    blue: 'bg-zinc-900 text-zinc-200 border-zinc-700',
    outline: 'bg-transparent text-zinc-300 border-zinc-700',
  };

  const dotStyles = {
    default: 'bg-zinc-400',
    healthy: 'bg-white animate-pulse',
    warning: 'bg-zinc-400',
    critical: 'bg-black',
    purple: 'bg-zinc-400',
    cyan: 'bg-white',
    blue: 'bg-zinc-300',
    outline: 'bg-zinc-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium border select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
};
