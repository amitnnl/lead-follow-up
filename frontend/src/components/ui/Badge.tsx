import clsx from 'clsx';
import type { ReactNode, HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  status?: 'new' | 'pending' | 'approved' | 'disbursed' | 'on_hold' | 'rejected' | 'default' | string;
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-primary-500', 
  pending: 'bg-amber-500', 
  approved: 'bg-emerald-500',
  disbursed: 'bg-teal-500', 
  on_hold: 'bg-purple-500', 
  rejected: 'bg-rose-500', 
  default: 'bg-slate-400'
};

export default function Badge({ children, status, className, ...props }: BadgeProps) {
  const normalizedStatus = status ? status.toLowerCase() : 'default';
  const sbClass = `sb-${normalizedStatus}`;
  const dot = STATUS_DOT[normalizedStatus] || STATUS_DOT.default;
  
  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        sbClass,
        className
      )}
      {...props}
    >
      {status && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
      {children}
    </span>
  );
}
