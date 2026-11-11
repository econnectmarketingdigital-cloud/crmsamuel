import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const glassButtonVariants = cva(
  'relative overflow-hidden cursor-pointer rounded-full transition-all duration-300 backdrop-blur-md border border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.22)] hover:border-white/40 text-white font-medium flex items-center justify-center',
  {
    variants: {
      size: {
        default: 'px-6 py-3 text-sm',
        sm: 'px-4 py-2 text-xs',
        lg: 'px-8 py-4 text-base',
        icon: 'h-10 w-10 p-0 flex items-center justify-center',
      },
      variant: {
        default: '',
        primary: 'bg-white text-[#050506] font-bold hover:bg-[#E4E4E7] border-white/60 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]',
      }
    },
    defaultVariants: {
      size: 'default',
      variant: 'default'
    },
  }
);

export const GlassButton = React.forwardRef(({ className, children, size, variant, contentClassName, ...props }, ref) => {
  return (
    <button className={cn(glassButtonVariants({ size, variant }), className)} ref={ref} {...props}>
      <span className={cn('relative z-10', contentClassName)}>{children}</span>
      <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none' />
    </button>
  );
});
GlassButton.displayName = 'GlassButton';

