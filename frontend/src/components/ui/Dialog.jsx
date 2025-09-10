import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function Dialog({ open, onOpenChange, title, children, trigger }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg">
          {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
          <div>{children}</div>
          <DialogPrimitive.Close className="mt-4 inline-block px-3 py-2 bg-gray-200 rounded">Close</DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
