import React from 'react';
import clsx from 'clsx';

export default function Button({ children, className = '', variant = 'default', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2';

  const variants = {
    default: 'bg-accent text-white hover:bg-accent/90 shadow-sm',
    secondary: 'bg-background text-primary border border-border hover:bg-gray-100',
    ghost: 'hover:bg-gray-100 hover:text-primary',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
