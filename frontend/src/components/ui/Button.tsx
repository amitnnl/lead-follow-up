import clsx from 'clsx';
import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className, 
  disabled,
  ...props 
}, ref) => {
  
  const baseClasses = 'inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer rounded-lg relative overflow-hidden';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/25 hover:shadow-md hover:shadow-primary-500/30 border border-transparent',
    secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/25 border border-transparent',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent',
    glass: 'glass-panel text-slate-800 dark:text-white border border-white/20 hover:bg-white/40 dark:hover:bg-slate-800/40',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-1 gap-1',
    md: 'text-xs px-3 py-1.5 gap-1.5',
    lg: 'text-xs px-4 py-2 gap-2',
  };

  return (
    <button 
      ref={ref}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        (disabled || isLoading) && 'opacity-60 cursor-not-allowed active:scale-100',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
