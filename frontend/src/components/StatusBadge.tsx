import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { FinalStatus, CheckResult } from '../types';

interface StatusBadgeProps {
  status: FinalStatus | CheckResult | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const norm = String(status).toUpperCase();

  let bg = 'bg-slate-100 text-slate-700 border-slate-300';
  let icon = <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  let label = status;

  if (norm.includes('VERIFIED') || norm === 'PASSED') {
    bg = 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
    icon = <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  } else if (norm === 'INVALID' || norm === 'FAILED') {
    bg = 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    icon = <XCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  } else if (norm.includes('REVIEW') || norm === 'WARNING') {
    bg = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    icon = <AlertTriangle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  } else if (norm.includes('UNABLE') || norm === 'SKIPPED') {
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
    icon = <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  } else if (norm === 'INFO') {
    bg = 'bg-sky-50 text-[#0369A1] border-sky-200';
    icon = <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses[size]}`}
      role="status"
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
};
