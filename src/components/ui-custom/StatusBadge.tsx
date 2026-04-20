import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type StatusType = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'paid' | 'overdue';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  preparing: {
    label: 'Preparing',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  ready: {
    label: 'Ready',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  completed: {
    label: 'Served / Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <motion.span
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={cn("w-2 h-2 rounded-full", config.dot)}
      />
      {config.label}
    </motion.span>
  );
}
