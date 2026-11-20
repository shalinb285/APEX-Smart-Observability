import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return '<1 ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

// Strictly Black & White / Monochromatic Status Styling
export function getStatusColor(status: 'healthy' | 'warning' | 'critical' | string): string {
  switch (status.toLowerCase()) {
    case 'critical':
    case 'error':
    case 'failed':
    case 'p1 - critical':
    case 'investigating':
      return 'text-black bg-white font-bold border-white';
    case 'warning':
    case 'monitoring':
    case 'identified':
    case 'moderate':
      return 'text-zinc-200 bg-zinc-900 border-zinc-500 border-dashed';
    case 'healthy':
    case 'success':
    case 'resolved':
      return 'text-zinc-100 bg-zinc-950 border-zinc-700';
    default:
      return 'text-zinc-400 bg-zinc-950 border-zinc-800';
  }
}

export function getStatusDot(status: 'healthy' | 'warning' | 'critical' | string): string {
  switch (status.toLowerCase()) {
    case 'critical':
    case 'error':
    case 'failed':
      return 'bg-black ring-1 ring-white';
    case 'warning':
    case 'monitoring':
    case 'moderate':
      return 'bg-zinc-400';
    case 'healthy':
    case 'success':
    case 'resolved':
      return 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]';
    default:
      return 'bg-zinc-500';
  }
}
