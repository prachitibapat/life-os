'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { today, formatDate } from '@/lib/utils';

const MOODS = [
  { val: 1, emoji: '😞', label: 'Rough' },
  { val: 2, emoji: '😟', label: 'Meh' },
  { val: 3, emoji: '😐', label: 'Okay' },
  { val: 4, emoji: '🙂', label: 'Good' },
  { val: 5, emoji: '😊', label: 'Great' },
];

const PROMPTS = [
  { key: 'went_well', label: 'What went well today?' },
  { key: 'would_change', label: 'What would I change?' },
  { key: 'grateful', label: 'What am I grateful for?' },
];

export function JournalClient() {
  const [date, setDate] = useState(today());
  const [entry, setEntry] = useState<any>(null);
  const [mood, setMood] = useState(0);
  const [content, setContent] = useState('');
  const [prompts, setPrompts] = useState<Record<string, string>>({ went_well: '', would_change: '', grateful: '' });
  const [recents, setRecents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, all] = await Promise.all([
      fetch(`/api/journal?date=${date}`).then(r => r.json()),
      fetch('/api/journal').then(r => r.json()),
    ]);
    const ent = Array.isArray(e) ? e[0] : e;
    if (ent && ent.id) {
      setEntry(ent);
      setMood(ent.mood || 0);
      setContent(ent.content || '');
      // DB columns are what_went_well / what_to_change / gratitude
      setPrompts({
        went_well: ent.what_went_well || '',
        would_change: ent.what_to_change || '',
        grateful: ent.gratitude || '',
      });
    } else {
      setEntry(null);
      setMood(0);
      setContent('');
      setPrompts({ went_well: '', would_change: '', grateful: '' });
    }
    setRecents(Array.isArray(all) ? all.slice(0, 10) : []);
  }

  useEffect(() => { load(); }, [date]);

  function shiftDate(n: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().split('T')[0]);
  }

  async function save() {
    setSaving(true);
    // Map local state keys → DB column names
    const body: any = {
      date, mood, content,
      what_went_well: prompts.went_well,
      what_to_change: prompts.would_change,
      gratitude: prompts.grateful,
    };
    const url = entry?.id ? `/api/journal/${entry.id}` : '/api/journal';
    const r = await fetch(url, { method: entry?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) {
      const saved = await r.json();
      setEntry(saved);
      setRecents(prev => {
        const filtered = prev.filter((e: any) => e.id !== saved.id);
        return [saved, ...filtered].slice(0, 10);
      });
      toast.success('Saved');
    } else toast.error('Failed to save');
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-6">
      {/* Main */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}><ChevronLeft size={18} /></Button>
          <h1 className="text-xl font-bold text-zinc-100">{date === today() ? 'Today' : formatDate(date)}</h1>
          <Button variant="ghost" size="icon" onClick={() => shiftDate(1)} disabled={date >= today()}><ChevronRight size={18} /></Button>
        </div>

        {/* Mood */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <Label className="text-sm text-zinc-400 mb-3 block">How are you feeling?</Label>
            <div className="flex gap-3">
              {MOODS.map(m => (
                <button key={m.val} onClick={() => setMood(m.val)} className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${mood === m.val ? 'bg-pink-500/20 ring-1 ring-pink-500/50 scale-110' : 'hover:bg-zinc-800'}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-xs text-zinc-400">{m.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prompts */}
        {PROMPTS.map(p => (
          <div key={p.key}>
            <Label className="text-sm text-zinc-400 mb-1.5 block">{p.label}</Label>
            <Textarea
              value={prompts[p.key]}
              onChange={e => setPrompts(prev => ({ ...prev, [p.key]: e.target.value }))}
              onBlur={save}
              placeholder="Write here…"
              className="bg-zinc-900 border-zinc-800 resize-none min-h-[80px] focus:border-pink-500/50"
              rows={3}
            />
          </div>
        ))}

        {/* Main entry */}
        <div>
          <Label className="text-sm text-zinc-400 mb-1.5 block">Journal Entry</Label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={save}
            placeholder="Write your thoughts, reflections, or anything on your mind…"
            className="bg-zinc-900 border-zinc-800 resize-none min-h-[200px] focus:border-pink-500/50"
            rows={10}
          />
        </div>
        <Button onClick={save} disabled={saving} className="bg-pink-600 hover:bg-pink-700 w-full">
          {saving ? 'Saving…' : 'Save Entry'}
        </Button>
      </div>

      {/* Recent entries sidebar */}
      <div className="w-52 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Recent</h2>
        <div className="space-y-1.5">
          {recents.map(e => (
            <button key={e.id} onClick={() => setDate(e.date)} className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${e.date === date ? 'bg-pink-500/15 border-pink-500/30 text-pink-300' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'}`}>
              <div className="flex items-center gap-2">
                <BookOpen size={12} />
                <span className="text-xs font-medium">{e.date}</span>
                {e.mood > 0 && <span className="ml-auto">{MOODS[e.mood - 1]?.emoji}</span>}
              </div>
              {e.content && <p className="text-xs text-zinc-500 mt-0.5 truncate">{e.content.slice(0, 50)}</p>}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
