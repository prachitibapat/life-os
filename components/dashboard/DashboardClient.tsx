'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RingProgress } from './RingProgress';
import { QuickAdd } from './QuickAdd';
import {
  CheckSquare, Flame, UtensilsCrossed, Dumbbell, BookOpen, Moon, Plus, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  summary?: {
    tasks: { total: number; done: number };
    habits: { total: number; done: number };
    calories: { consumed: number; target: number; protein: number; carbs: number; fat: number };
    workout: { done: boolean };
    journalStreak: number;
    sleep: { hours: number; quality: number } | null;
  };
  recentTasks?: any[];
  habits?: any[];
  quote?: { text: string; author: string };
  weeklyProgress?: { habits: number; workouts: { done: number; target: number }; sleepAvg: number; caloriesAvg: number };
}

const PRIORITY_DOT: Record<string, string> = {
  P1: 'bg-red-400', P2: 'bg-orange-400', P3: 'bg-blue-400', P4: 'bg-muted-foreground',
};

const STAT_CARDS = [
  { key: 'tasks',   href: '/tasks',     Icon: CheckSquare,     color: '#a78bfa', label: 'Tasks' },
  { key: 'habits',  href: '/habits',    Icon: Flame,           color: '#34d399', label: 'Habits' },
  { key: 'cals',    href: '/nutrition', Icon: UtensilsCrossed, color: '#fbbf24', label: 'kcal' },
  { key: 'sleep',   href: '/sleep',     Icon: Moon,            color: '#94a3b8', label: 'Sleep' },
  { key: 'workout', href: '/fitness',   Icon: Dumbbell,        color: '#f87171', label: 'Workouts' },
  { key: 'journal', href: '/journal',   Icon: BookOpen,        color: '#f472b6', label: 'J. Streak' },
];

export function DashboardClient() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState(false);
  const [habits, setHabits] = useState<any[]>([]);

  async function load() {
    try {
      const [dash, habitsRes] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/habits?history=false').then(r => r.json()),
      ]);
      setData(dash);
      setHabits(Array.isArray(habitsRes) ? habitsRes : []);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleHabit(id: number, checked: boolean) {
    await fetch(`/api/habits/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString().split('T')[0], checked }),
    });
    setHabits(prev => prev.map(h => h.id === id ? { ...h, checked_today: checked } : h));
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );

  const summary = data.summary || { tasks: { total: 0, done: 0 }, habits: { total: 0, done: 0 }, calories: { consumed: 0, target: 2000, protein: 0, carbs: 0, fat: 0 }, workout: { done: false }, journalStreak: 0, sleep: null };
  const weekly = data.weeklyProgress || { habits: 0, workouts: { done: 0, target: 4 }, sleepAvg: 0, caloriesAvg: 0 };
  const recentTasks = data.recentTasks || [];

  const statValues: Record<string, string> = {
    tasks:   `${summary.tasks.done}/${summary.tasks.total}`,
    habits:  `${summary.habits.done}/${summary.habits.total}`,
    cals:    `${summary.calories.consumed}`,
    sleep:   summary.sleep ? `${summary.sleep.hours.toFixed(1)}h` : '—',
    workout: `${weekly.workouts.done}/${weekly.workouts.target}`,
    journal: `${summary.journalStreak}`,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting()}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <Button
          onClick={() => setQuickAdd(v => !v)}
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus size={15} /> Quick Add
        </Button>
      </div>

      {quickAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <QuickAdd onClose={() => { setQuickAdd(false); load(); }} />
        </motion.div>
      )}

      {/* Quote */}
      {data.quote && (
        <div className="flex gap-3 px-4 py-3.5 rounded-xl border border-border/60 bg-card">
          <Sparkles size={14} className="text-primary/70 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-foreground/80 italic leading-relaxed">"{data.quote.text}"</p>
            <p className="text-xs text-muted-foreground mt-1">— {data.quote.author}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {STAT_CARDS.map(({ key, href, Icon, color, label }) => (
          <Link key={key} href={href}>
            <div className="stat-card flex flex-col items-center gap-1.5 cursor-pointer">
              <Icon size={18} style={{ color }} />
              <span className="text-xl font-semibold text-foreground tabular-nums">{statValues[key]}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Nutrition + Weekly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="module-card">
          <p className="section-label">Nutrition Today</p>
          <div className="flex items-center gap-5">
            <RingProgress
              value={summary.calories.target > 0 ? (summary.calories.consumed / summary.calories.target) * 100 : 0}
              size={96}
              color="#fbbf24"
              label={`${summary.calories.consumed}`}
              sublabel="kcal"
            />
            <div className="flex-1 space-y-2.5">
              {[
                { label: 'Protein', val: summary.calories.protein, max: 150, color: '#34d399' },
                { label: 'Carbs', val: summary.calories.carbs, max: 250, color: '#fbbf24' },
                { label: 'Fat', val: summary.calories.fat, max: 65, color: '#f87171' },
              ].map(({ label, val, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground/70">{val}g</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min((val / max) * 100, 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="module-card">
          <p className="section-label">Weekly Progress</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Habit rate</span>
                <span className="text-foreground font-medium">{weekly.habits}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${weekly.habits}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Workouts</span>
                <span className="text-foreground font-medium">{weekly.workouts.done}/{weekly.workouts.target}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${weekly.workouts.target > 0 ? (weekly.workouts.done / weekly.workouts.target) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Avg sleep</span>
                <span className="text-foreground font-medium">{weekly.sleepAvg || '—'}h</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${Math.min((weekly.sleepAvg / 9) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks + Habits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="module-card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label mb-0">Today's Tasks</p>
            <Link href="/tasks" className="text-xs text-primary hover:text-primary/80 transition-colors">View all →</Link>
          </div>
          {recentTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks due today</p>
          )}
          <div className="space-y-2">
            {recentTasks.slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-muted-foreground'}`} />
                <span className={`text-sm flex-1 truncate ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="module-card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label mb-0">Today's Habits</p>
            <Link href="/habits" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">View all →</Link>
          </div>
          {habits.length === 0 && <p className="text-sm text-muted-foreground">No habits set up yet</p>}
          <div className="space-y-2.5">
            {habits.slice(0, 6).map((h: any) => (
              <div key={h.id} className="flex items-center gap-3">
                <Checkbox
                  checked={!!h.checked_today}
                  onCheckedChange={checked => toggleHabit(h.id, !!checked)}
                  className="border-emerald-600/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className="text-base">{h.icon || '✅'}</span>
                <span className={`text-sm flex-1 ${h.checked_today ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>
                  {h.name}
                </span>
                {h.streak > 0 && (
                  <span className="text-[11px] text-orange-400 font-medium">🔥 {h.streak}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
