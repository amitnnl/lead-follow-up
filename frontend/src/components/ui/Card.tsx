import clsx from 'clsx';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  glass?: boolean;
  animate?: boolean;
}

export default function Card({ children, className, hoverable, glass, animate = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'card rounded-2xl transition-all duration-300 relative overflow-hidden',
        hoverable && 'card-hover',
        glass && 'glass-panel',
        animate && 'animate-in zoom-in-95 duration-500',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
