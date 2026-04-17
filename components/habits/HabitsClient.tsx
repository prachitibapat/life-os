'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { today, getDatesInRange } from '@/lib/utils';

const COLORS = ['#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899'];
const EMOJIS = ['✅','🏃','💧','📚','🧘','💊','🎯','⚡','🌙','🍎'];

function Heatmap({ history }: { history: Record<string, boolean> }) {
  const end = today();
  const startDate = new Date(new Date(end).getTime() - 89 * 86400000).toISOString().split('T')[0];
  const dates = getDatesInRange(startDate, end);
  return (
    <div className="flex flex-wrap gap-0.5">
      {dates.map(d => (
        <div key={d} title={d} className="w-3 h-3 rounded-sm" style={{ backgroundColor: history[d] ? '#10B981' : '#27272a' }} />
      ))}
    </div>
  );
}

export function HabitsClient() {
  const [habits, setHabits] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', frequency: 'daily', color: COLORS[0], icon: EMOJIS[0] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch('/api/habits?history=true').then(r => r.json());
    const raw = Array.isArray(r) ? r : [];
    // API returns `completed_today` (0|1) and `history` as date-string array
    // Normalize to what the UI expects
    const normalized = raw.map((h: any) => ({
      ...h,
      checked_today: !!h.completed_today,
      history: Array.isArray(h.history)
        ? Object.fromEntries(h.history.map((d: string) => [d, true]))
        : (h.history || {}),
    }));
    setHabits(normalized);
  }

  useEffect(() => { load(); }, []);

  async function toggleHabit(id: number, checked: boolean) {
    await fetch(`/api/habits/${id}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: today(), checked }) });
    setHabits(prev => prev.map(h => h.id === id ? { ...h, checked_today: checked } : h));
  }

  async function addHabit() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Habit name is required';
    else if (form.name.length > 100) e.name = 'Max 100 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const r = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, name: form.name.trim() }) });
    if (r.ok) {
      toast.success('Habit created');
      setForm({ name: '', frequency: 'daily', color: COLORS[0], icon: EMOJIS[0] });
      setErrors({});
      setOpen(false);
      load();
    } else toast.error('Failed to create habit');
  }

  async function deleteHabit(id: number) {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    setHabits(prev => prev.filter(h => h.id !== id));
    toast.success('Deleted');
  }

  const done = habits.filter(h => h.checked_today).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Habits</h1>
          <p className="text-zinc-400 text-sm mt-1">{done}/{habits.length} done today</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Plus size={16} />New Habit</Button></DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader><DialogTitle>New Habit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name <span className="text-red-400">*</span></Label>
                <Input
                  placeholder="Habit name…"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
              </div>
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, icon: e }))} className={`text-xl p-1.5 rounded-lg transition-colors ${form.icon === e ? 'bg-zinc-700 ring-1 ring-emerald-500' : 'hover:bg-zinc-800'}`}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/30' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={addHabit}>Create Habit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {habits.length === 0 && <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center text-zinc-500">No habits yet. Create your first habit!</CardContent></Card>}
        {habits.map(h => (
          <Card key={h.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={!!h.checked_today}
                  onCheckedChange={checked => toggleHabit(h.id, !!checked)}
                  style={{ borderColor: h.color || '#10B981' }}
                  className="data-[state=checked]:bg-emerald-500 w-5 h-5"
                />
                <span className="text-2xl">{h.icon || '✅'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${h.checked_today ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{h.name}</span>
                    {h.streak > 0 && (
                      <Badge style={{ backgroundColor: (h.color || '#10B981') + '30', color: h.color || '#10B981', borderColor: (h.color || '#10B981') + '50' }} className="text-xs border">
                        🔥 {h.streak} day streak
                      </Badge>
                    )}
                    {h.longest_streak > 0 && h.longest_streak > h.streak && (
                      <span className="text-xs text-zinc-500">best: {h.longest_streak}</span>
                    )}
                  </div>
                  {h.history && (
                    <div className="mt-2">
                      <Heatmap history={h.history} />
                    </div>
                  )}
                </div>
                <button onClick={() => deleteHabit(h.id)} className="text-zinc-600 hover:text-red-400 transition-colors ml-2"><Trash2 size={15} /></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
