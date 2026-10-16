import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { primaryButtonClass, secondaryButtonClass } from './ui';

/** Checkout button: same shape as the fields. `outline` is the quiet secondary action. */
export function BookingButton({
  variant = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' }) {
  return (
    <button
      className={cn(variant === 'outline' ? secondaryButtonClass : primaryButtonClass, className)}
      {...props}
    />
  );
}
