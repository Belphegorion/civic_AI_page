import React from 'react';
import { clsx } from 'clsx';

export default function Card({ children, className = '' }) {
  return (
    <div
      className={clsx(
        'bg-surface rounded-lg border border-border shadow-subtle',
        'p-4 sm:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}
