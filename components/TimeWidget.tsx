'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from './ui/Badge';

export const TimeWidget = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <Clock size={20} className="text-zinc-500" />
        <Badge color="emerald">Online</Badge>
      </div>
      <div>
        <div className="text-3xl font-light tracking-tight text-white tabular-nums">
          {time.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute:'2-digit'
          })}
        </div>
        <div className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-widest">
          Local System Time
        </div>
      </div>
    </div>
  );
};
