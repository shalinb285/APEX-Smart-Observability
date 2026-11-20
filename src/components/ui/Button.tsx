import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'purple' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs gap-1.5 rounded-md',
    sm: 'px-3 py-1.5 text-xs gap-2 rounded-lg font-medium',
    md: 'px-4 py-2 text-sm gap-2 rounded-lg font-medium',
    lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl font-semibold',
  };

  // Strictly Black and White Monochrome Styles
  const variantStyles = {
    primary:
      'bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 shadow-sm border border-white font-semibold',
    secondary:
      'bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 active:bg-zinc-950',
    danger:
      'bg-black text-white border border-white hover:bg-zinc-900 active:bg-zinc-800 font-semibold',
    ghost:
      'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900',
    outline:
      'bg-transparent text-zinc-200 border border-zinc-700 hover:border-zinc-400 hover:text-white',
    // Fallback aliases for purple & cyan transformed into high-contrast monochrome
    purple:
      'bg-zinc-900 text-white border border-zinc-600 hover:bg-zinc-800 hover:border-zinc-400',
    cyan:
      'bg-white text-black border border-white hover:bg-zinc-200 font-semibold',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-mono',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : icon}
      {children}
    </button>
  );
};
