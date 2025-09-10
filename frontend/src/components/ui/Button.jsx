import React from 'react';
import clsx from 'clsx';

/**
 * Simple shadcn-style Button wrapper (accessible).
 * Props: variant = 'default' | 'ghost' | 'destructive', size = 'md'
 */
export default function Button({ children, className = '', variant = 'default', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    default: 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
