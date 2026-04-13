'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, SkipForward, Settings, X } from 'lucide-react';

type Mode = 'work' | 'short' | 'long';

const DEFAULTS = { work: 25, short: 5, long: 15 };
const MODE_LABEL: Record<Mode, string> = { work: 'Focus', short: 'Short Break', long: 'Long Break' };
const MODE_COLOR: Record<Mode, string> = { work: '#EF4444', short: '#10B981', long: '#3B82F6' };

interface Session { mode: Mode; completedAt: string; label: string; }

export function PomodoroClient() {
  const [durations, setDurations] = useState({ work: 25, short: 5, long: 15 });
  const [mode, setMode] = useState<Mode>('work');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(1); // pomodoros completed this session
  const [sessions, setSessions] = useState<Session[]>([]);
  const [task, setTask] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempDur, setTempDur] = useState({ work: 25, short: 5, long: 15 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const total = durations[mode] * 60;
  const pct = ((total - seconds) / total) * 100;

  const beep = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  const switchMode = useCallback((next: Mode, newCycle?: number) => {
    setMode(next);
    setSeconds(durations[next] * 60);
    setRunning(false);
    const c = newCycle ?? cycle;
    setCycle(c);
  }, [durations, cycle]);

  const complete = useCallback(() => {
    beep();
    setSessions(prev => [{
      mode,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      label: task || MODE_LABEL[mode],
    }, ...prev.slice(0, 19)]);
    if (mode === 'work') {
      const newCycle = cycle + 1;
      switchMode(newCycle % 4 === 0 ? 'long' : 'short', newCycle);
    } else {
      switchMode('work');
    }
  }, [mode, cycle, task, beep, switchMode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { complete(); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, complete]);

  const reset = () => { setRunning(false); setSeconds(durations[mode] * 60); };
  const skip = () => complete();

  const applySettings = () => {
    setDurations(tempDur);
    setSeconds(tempDur[mode] * 60);
    setRunning(false);
    setShowSettings(false);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const circumference = 2 * Math.PI * 110;
  const strokeOffset = circumference * (1 - pct / 100);

  const workCount = sessions.filter(s => s.mode === 'work').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-4 max-w-lg mx-auto">

      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MODE_COLOR[mode] }}>Pomodoro</h1>
          <p className="text-zinc-400 text-sm">{workCount} sessions completed today</p>
        </div>
        <button onClick={() => { setTempDur(durations); setShowSettings(s => !s); }}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <Settings size={18} />
        </button>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">Timer Durations (minutes)</span>
                  <button onClick={() => setShowSettings(false)}><X size={16} className="text-zinc-500" /></button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {(['work','short','long'] as Mode[]).map(m => (
                    <div key={m}>
                      <label className="text-xs text-zinc-400 mb-1 block">{MODE_LABEL[m]}</label>
                      <Input type="number" min={1} max={60} value={tempDur[m]}
                        onChange={e => setTempDur(p => ({ ...p, [m]: parseInt(e.target.value) || DEFAULTS[m] }))}
                        className="text-center" />
                    </div>
                  ))}
                </div>
                <Button onClick={applySettings} className="w-full" size="sm">Apply</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {(['work','short','long'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setRunning(false); setMode(m); setSeconds(durations[m] * 60); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={mode === m ? { backgroundColor: MODE_COLOR[m] + '22', color: MODE_COLOR[m], border: `1px solid ${MODE_COLOR[m]}44` }
              : { color: '#71717a', border: '1px solid transparent' }}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Ring timer */}
      <div className="relative flex items-center justify-center">
        <svg width={260} height={260} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={130} cy={130} r={110} fill="none" stroke="#27272a" strokeWidth={10} />
          <circle cx={130} cy={130} r={110} fill="none" stroke={MODE_COLOR[mode]} strokeWidth={10}
            strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round"
            style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }} />
        </svg>
        <div className="absolute flex flex-col items-center gap-1">
          <AnimatePresence mode="wait">
            <motion.span key={`${mm}${ss}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-6xl font-bold font-mono tracking-tight"
              style={{ color: MODE_COLOR[mode] }}>
              {mm}:{ss}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-zinc-400">{MODE_LABEL[mode]}</span>
          {cycle > 1 && <span className="text-xs text-zinc-600">Cycle {cycle}</span>}
        </div>
      </div>

      {/* Task input */}
      <Input value={task} onChange={e => setTask(e.target.value)}
        placeholder="What are you working on? (optional)"
        className="text-center bg-zinc-900 border-zinc-800 max-w-xs" />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={reset} title="Reset">
          <RotateCcw size={18} />
        </Button>
        <Button size="lg" onClick={() => setRunning(r => !r)}
          className="w-32 text-base font-semibold"
          style={{ backgroundColor: MODE_COLOR[mode] }}>
          {running ? <><Pause size={18} className="mr-2" />Pause</> : <><Play size={18} className="mr-2" />Start</>}
        </Button>
        <Button variant="outline" size="icon" onClick={skip} title="Skip">
          <SkipForward size={18} />
        </Button>
      </div>

      {/* Cycle indicators */}
      <div className="flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full transition-colors"
            style={{ backgroundColor: i < workCount % 8 ? MODE_COLOR['work'] : '#27272a' }} />
        ))}
      </div>

      {/* Session log */}
      {sessions.length > 0 && (
        <Card className="w-full">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-zinc-400 mb-3">Session History</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MODE_COLOR[s.mode] }} />
                    <span className="text-zinc-300">{s.label}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{s.completedAt}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
