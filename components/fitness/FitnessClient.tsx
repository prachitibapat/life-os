'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronDown, ChevronUp, Dumbbell, Trophy, Trash2, X, LayoutGrid } from 'lucide-react';
import { today } from '@/lib/utils';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  strength: { bg: '#f87171/10', text: '#f87171', border: '#f87171/20' },
  cardio:   { bg: '#60a5fa/10', text: '#60a5fa', border: '#60a5fa/20' },
  flexibility: { bg: '#34d399/10', text: '#34d399', border: '#34d399/20' },
};

interface Exercise { name: string; sets: string; reps: string; weight: string; }

const TYPE_GROUP: Record<string, string> = {
  'Push Day A': 'strength', 'Pull Day A': 'strength', 'Legs Day A': 'strength',
  'Upper Body': 'strength', 'Lower Body': 'strength',
  'Full Body A': 'strength', 'Full Body B': 'strength',
  'Back & Biceps': 'strength', 'Chest & Triceps': 'strength', 'Arm Day': 'strength',
  'HIIT Circuit': 'cardio', 'Cardio Run': 'cardio',
  'Mobility & Stretch': 'flexibility',
};

export function FitnessClient() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'strength', duration: '', date: today() });
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: '', reps: '', weight: '' }]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    const [w, t] = await Promise.all([
      fetch('/api/fitness').then(r => r.json()),
      fetch('/api/fitness/templates').then(r => r.json()),
    ]);
    // GET returns { workouts, personalRecords } — extract workouts
    setWorkouts(Array.isArray(w) ? w : (Array.isArray(w?.workouts) ? w.workouts : []));
    setTemplates(Array.isArray(t) ? t : []);
  }

  useEffect(() => { load(); }, []);

  function toggleExpanded(id: number) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function addExerciseRow() { setExercises(prev => [...prev, { name: '', sets: '', reps: '', weight: '' }]); }
  function removeExerciseRow(i: number) { setExercises(prev => prev.filter((_, idx) => idx !== i)); }
  function updateExercise(i: number, field: keyof Exercise, val: string) {
    setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }

  async function logWorkout() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Workout name is required';
    else if (form.name.length > 100) e.name = 'Max 100 characters';
    if (form.duration) {
      const d = Number(form.duration);
      if (isNaN(d) || d < 1) e.duration = 'Must be at least 1 minute';
      else if (d > 600) e.duration = 'Max 600 minutes (10 h)';
    }
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const exs = exercises
      .filter(ex => ex.name.trim())
      .map(ex => ({ name: ex.name, sets: Number(ex.sets) || 0, reps: Number(ex.reps) || 0, weight: Number(ex.weight) || 0 }));
    const r = await fetch('/api/fitness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duration: Number(form.duration) || 0, exercises: exs }),
    });
    if (r.ok) {
      const newWorkout = await r.json();
      setWorkouts(prev => [newWorkout, ...prev]);
      toast.success('Workout logged!');
      setOpen(false);
      setForm({ name: '', type: 'strength', duration: '', date: today() });
      setExercises([{ name: '', sets: '', reps: '', weight: '' }]);
    } else toast.error('Failed to log workout');
  }

  function loadTemplate(t: any) {
    setForm(f => ({ ...f, name: t.name, type: t.type || 'strength' }));
    if (t.exercises?.length) {
      setExercises(t.exercises.map((e: any) => ({
        name: e.name || '', sets: String(e.sets || ''), reps: String(e.reps || ''), weight: String(e.weight || ''),
      })));
    }
  }

  async function deleteWorkout(id: number) {
    await fetch(`/api/fitness/${id}`, { method: 'DELETE' });
    setWorkouts(prev => prev.filter(w => w.id !== id));
    toast.success('Deleted');
  }

  // Build PR map from logged workouts
  const prMap: Record<string, number> = {};
  workouts.forEach(w => {
    (w.exercises || []).forEach((e: any) => {
      if (e.weight > 0 && e.weight > (prMap[e.name] || 0)) prMap[e.name] = e.weight;
    });
  });

  const typeGroups = ['all', 'strength', 'cardio', 'flexibility'];
  const filteredTemplates = selectedGroup === 'all'
    ? templates
    : templates.filter(t => (t.type || TYPE_GROUP[t.name] || 'strength') === selectedGroup);

  const weekWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Fitness</h1>
          <p className="page-sub">{weekWorkouts.length} workout{weekWorkouts.length !== 1 ? 's' : ''} this week</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-red-500 hover:bg-red-600 text-white">
              <Plus size={15} /> Log Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Log Workout</DialogTitle>
            </DialogHeader>

            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quick Load Template</Label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => loadTemplate(t)}
                      className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-accent hover:border-border/80 text-foreground transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Workout Name <span className="text-red-400">*</span></Label>
                  <Input
                    placeholder="Push day…"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(v => ({ ...v, name: '' })); }}
                    className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number" min="1" max="600" placeholder="60"
                    value={form.duration}
                    onChange={e => { setForm(f => ({ ...f, duration: e.target.value })); setErrors(v => ({ ...v, duration: '' })); }}
                    className={`mt-1 ${errors.duration ? 'border-red-500' : ''}`}
                  />
                  {errors.duration && <p className="text-xs text-red-400 mt-0.5">{errors.duration}</p>}
                </div>
                <div>
                  <Label className="text-xs">Date <span className="text-red-400">*</span></Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setErrors(v => ({ ...v, date: '' })); }}
                    className={`mt-1 ${errors.date ? 'border-red-500' : ''}`}
                  />
                  {errors.date && <p className="text-xs text-red-400 mt-0.5">{errors.date}</p>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Exercises</Label>
                  <Button size="sm" variant="ghost" onClick={addExerciseRow} className="h-6 text-xs gap-1 px-2">
                    <Plus size={11} /> Add
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-1 text-[11px] text-muted-foreground px-1 mb-1">
                  <span className="col-span-5">Exercise</span>
                  <span className="col-span-2">Sets</span>
                  <span className="col-span-2">Reps</span>
                  <span className="col-span-2">kg</span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {exercises.map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1">
                      <Input className="col-span-5 h-8 text-sm" placeholder="Bench press" value={e.name} onChange={ev => updateExercise(i, 'name', ev.target.value)} />
                      <Input className="col-span-2 h-8 text-sm" placeholder="3" value={e.sets} onChange={ev => updateExercise(i, 'sets', ev.target.value)} />
                      <Input className="col-span-2 h-8 text-sm" placeholder="10" value={e.reps} onChange={ev => updateExercise(i, 'reps', ev.target.value)} />
                      <Input className="col-span-2 h-8 text-sm" placeholder="60" value={e.weight} onChange={ev => updateExercise(i, 'weight', ev.target.value)} />
                      <button onClick={() => removeExerciseRow(i)} className="flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white" onClick={logWorkout}>
                Log Workout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates browser */}
      <div className="module-card">
        <div className="flex items-center gap-3 mb-3">
          <LayoutGrid size={15} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Workout Templates</span>
          <div className="ml-auto flex gap-1">
            {typeGroups.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`text-xs px-2.5 py-1 rounded-md capitalize transition-colors ${selectedGroup === g ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredTemplates.map(t => {
            const type = t.type || 'strength';
            const colors = TYPE_COLORS[type] || TYPE_COLORS.strength;
            return (
              <button
                key={t.id}
                onClick={() => { loadTemplate(t); setOpen(true); }}
                className="text-left p-3 rounded-lg border border-border bg-secondary/40 hover:bg-accent transition-all group"
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-xs font-medium text-foreground leading-tight">{t.name}</span>
                </div>
                <span
                  className="inline-block text-[10px] px-1.5 py-0.5 rounded capitalize font-medium"
                  style={{ color: colors.text, backgroundColor: `${colors.text}18` }}
                >
                  {type}
                </span>
                {t.exercises && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {Array.isArray(t.exercises) ? t.exercises.length : JSON.parse(t.exercises || '[]').length} exercises
                  </p>
                )}
              </button>
            );
          })}
          {filteredTemplates.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground py-4">No templates for this type</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Workouts list */}
        <div className="lg:col-span-2 space-y-3">
          <p className="section-label">Recent Workouts</p>
          {workouts.length === 0 && (
            <div className="module-card py-14 text-center">
              <Dumbbell size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No workouts logged yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use a template above or log manually</p>
            </div>
          )}
          {workouts.map(w => {
            const type = w.type || 'strength';
            const colors = TYPE_COLORS[type] || TYPE_COLORS.strength;
            return (
              <div key={w.id} className="module-card p-0 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.text}15` }}>
                      <Dumbbell size={16} style={{ color: colors.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-foreground truncate">{w.name}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium shrink-0"
                          style={{ color: colors.text, backgroundColor: `${colors.text}18` }}
                        >
                          {w.type}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {w.date} · {w.duration_minutes || w.duration || 0} min · {(w.exercises || []).length} exercises
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(w.exercises || []).length > 0 && (
                        <button onClick={() => toggleExpanded(w.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                          {expanded.has(w.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button onClick={() => deleteWorkout(w.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {expanded.has(w.id) && (w.exercises || []).length > 0 && (
                  <div className="border-t border-border bg-secondary/30 px-4 py-3">
                    <div className="grid grid-cols-4 text-[11px] text-muted-foreground mb-2 px-1">
                      <span className="col-span-2">Exercise</span><span>Sets</span><span>Reps × kg</span>
                    </div>
                    <div className="space-y-1.5">
                      {w.exercises.map((e: any, i: number) => (
                        <div key={i} className="grid grid-cols-4 text-sm px-1">
                          <span className="col-span-2 text-foreground/80 text-xs">{e.name}</span>
                          <span className="text-muted-foreground text-xs">{e.sets}</span>
                          <span className="text-muted-foreground text-xs">{e.reps}{e.weight > 0 ? ` × ${e.weight}kg` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Personal Records */}
        <div>
          <p className="section-label">Personal Records</p>
          <div className="module-card">
            {Object.keys(prMap).length === 0 && (
              <div className="py-8 text-center">
                <Trophy size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No records yet</p>
              </div>
            )}
            <div className="space-y-2">
              {Object.entries(prMap)
                .sort((a, b) => b[1] - a[1])
                .map(([name, weight]) => (
                  <div key={name} className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0">
                    <Trophy size={13} className="text-yellow-500 shrink-0" />
                    <span className="flex-1 text-sm text-foreground/80 truncate">{name}</span>
                    <span className="text-sm font-semibold text-yellow-500">{weight}kg</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
