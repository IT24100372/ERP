import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: 'coral' | 'blue' | 'green' | 'amber' | 'purple';
  delay?: number;
  large?: boolean;
}

const colorVariants = {
  coral: {
    bg: 'bg-[#ff5a65]/10',
    text: 'text-[#ff5a65]',
    gradient: 'from-[#ff5a65] to-[#ffa7ac]',
    shadow: 'shadow-[#ff5a65]/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-400',
    shadow: 'shadow-blue-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    gradient: 'from-emerald-500 to-emerald-400',
    shadow: 'shadow-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    gradient: 'from-amber-500 to-amber-400',
    shadow: 'shadow-amber-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-400',
    shadow: 'shadow-purple-500/20',
  },
};

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 1500;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export function StatCard({ 
  title, 
  value, 
  prefix = '', 
  suffix = '', 
  change, 
  changeLabel = 'vs last week',
  icon: Icon, 
  color,
  delay = 0,
  large = false,
}: StatCardProps) {
  const colors = colorVariants[color];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ 
        y: -5, 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        transition: { duration: 0.3 }
      }}
      className={cn(
        "bg-white rounded-2xl p-6 border border-gray-100 relative overflow-hidden group",
        large && "row-span-2"
      )}
    >
      {/* Background Gradient Glow */}
      <div className={cn(
        "absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-30",
        colors.bg
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            colors.bg
          )}>
            <Icon className={cn("w-6 h-6", colors.text)} />
          </div>
          
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
              isPositive && "bg-emerald-50 text-emerald-600",
              isNegative && "bg-red-50 text-red-600",
              !isPositive && !isNegative && "bg-gray-50 text-gray-600"
            )}>
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className={cn(
          "font-bold text-[#151515] tracking-tight",
          large ? "text-4xl mb-2" : "text-3xl mb-1"
        )}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </div>

        {/* Title */}
        <p className="text-gray-500 font-medium">{title}</p>

        {/* Change Label */}
        {change !== undefined && (
          <p className="text-xs text-gray-400 mt-2">{changeLabel}</p>
        )}
      </div>

      {/* Bottom Gradient Line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        colors.gradient
      )} />
    </motion.div>
  );
}
