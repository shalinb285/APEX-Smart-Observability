import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'bordered';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  noPadding = false,
  ...props
}) => {
  // Pure Black & White / Deep Monochrome Surfaces
  const variantStyles = {
    default: 'bg-[#09090B] border border-zinc-800 shadow-sm',
    glass: 'bg-[#09090B]/90 backdrop-blur-md border border-zinc-800 shadow-inner-dark',
    gradient: 'bg-gradient-to-b from-[#141417] to-[#050505] border border-zinc-800',
    bordered: 'bg-transparent border border-zinc-800',
  };

  return (
    <div
      className={cn(
        'rounded-xl text-zinc-100 transition-all duration-200',
        variantStyles[variant],
        noPadding ? '' : 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('flex items-center justify-between pb-3 border-b border-zinc-800 mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={cn('text-sm font-semibold tracking-wide uppercase text-zinc-200 font-mono flex items-center gap-2', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => (
  <p className={cn('text-xs text-zinc-400 mt-1', className)} {...props}>
    {children}
  </p>
);
