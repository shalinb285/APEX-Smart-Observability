import React from 'react';
import { cn } from '../../lib/utils';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  wrapperClassName,
  ...props
}) => {
  return (
    <div className={cn('relative flex items-center', wrapperClassName)}>
      <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-8 py-1.5 text-xs font-mono bg-[#0D121F] border border-[#20293F] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all',
          className
        )}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
