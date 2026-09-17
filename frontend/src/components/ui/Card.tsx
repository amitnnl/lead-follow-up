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
        'card rounded-xl transition-all relative overflow-hidden',
        hoverable && 'card-hover',
        glass && 'glass-panel',
        animate && 'animate-in zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
