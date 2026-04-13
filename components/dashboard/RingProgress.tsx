'use client';

interface RingProgressProps {
  value: number;
  size?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  strokeWidth?: number;
}

export function RingProgress({ value, size = 120, color = '#8B5CF6', label, sublabel, strokeWidth = 10 }: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        {label && <span className="text-base font-bold text-zinc-100 leading-none">{label}</span>}
        {sublabel && <span className="text-xs text-zinc-400 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
