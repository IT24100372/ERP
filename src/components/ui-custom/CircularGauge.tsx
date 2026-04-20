import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  delay?: number;
}

export function CircularGauge({ 
  value, 
  max, 
  size = 120, 
  strokeWidth = 10,
  label,
  sublabel,
  delay = 0,
}: CircularGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 1000;
      const steps = 30;
      const stepValue = value / steps;
      let current = 0;
      
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          current += stepValue;
          if (current >= value) {
            setAnimatedValue(value);
            clearInterval(interval);
          } else {
            setAnimatedValue(Math.floor(current));
          }
        }, duration / steps);

        return () => clearInterval(interval);
      }, delay * 1000);

      return () => clearTimeout(timer);
    }
  }, [isInView, value, delay]);

  const getColor = (pct: number) => {
    if (pct >= 70) return '#10b981'; // emerald-500
    if (pct >= 40) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor(percentage);
  const isLow = percentage < 40;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={cn(
              "text-2xl font-bold",
              isLow ? "text-red-500" : "text-gray-800"
            )}
          >
            {animatedValue}
          </motion.span>
          <span className="text-xs text-gray-400">{Math.round(percentage)}%</span>
        </div>

        {/* Pulse Effect for Low Stock */}
        {isLow && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border-2 border-red-400"
          />
        )}
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <p className="font-medium text-sm text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
    </motion.div>
  );
}
