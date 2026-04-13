'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RingProgress } from '@/components/dashboard/RingProgress';
import { ChevronLeft, ChevronRight, Plus, Trash2, Search, UtensilsCrossed } from 'lucide-react';
import { today } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_META: Record<string, { color: string; label: string }> = {
  breakfast: { color: '#fbbf24', label: 'Breakfast' },
  lunch:     { color: '#34d399', label: 'Lunch' },
  dinner:    { color: '#a78bfa', label: 'Dinner' },
  snack:     { color: '#22d3ee', label: 'Snack' },
};

const MACRO_COLORS = {
  protein: '#34d399',
  carbs:   '#fbbf24',
  fat:     '#f87171',
};

// Template categories for Indian food browsing
const TEMPLATE_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'bread', label: 'Breads & Rice' },
  { key: 'dal', label: 'Dal & Legumes' },
  { key: 'paneer', label: 'Paneer & Veg' },
  { key: 'nonveg', label: 'Non-Veg' },
  { key: 'south', label: 'South Indian' },
  { key: 'snack', label: 'Snacks' },
  { key: 'dairy', label: 'Dairy & Drinks' },
  { key: 'other', label: 'Other' },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  bread:  ['roti','naan','paratha','rice','jeera','pulao','biryani','lemon rice','curd rice'],
  dal:    ['dal','rajma','chana','chole','makhani'],
  paneer: ['paneer','aloo gobi','baingan','matar','aloo sabzi'],
  nonveg: ['chicken','mutton','fish','egg','butter chicken','tandoori'],
  south:  ['idli','dosa','sambar','upma','pongal','vada'],
  snack:  ['poha','khichdi','samosa','vada pav','pav bhaji','dhokla'],
  dairy:  ['dahi','raita','lassi','chai','buttermilk','chaas','curd'],
};

function categorize(name: string): string {
  const lname = name.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => lname.includes(kw))) return cat;
  }
  return 'other';
}

export function NutritionClient() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({ calorie_target: 2000, protein_target: 150, carbs_target: 250, fat_target: 65 });
  const [form, setForm] = useState({ name: '', meal_type: 'lunch', calories: '', protein: '', carbs: '', fat: '' });
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  async function load() {
    const [ents, tmpl, sett] = await Promise.all([
      fetch(`/api/nutrition?date=${date}`).then(r => r.json()),
      fetch('/api/nutrition/templates').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]);
    setEntries(Array.isArray(ents) ? ents : []);
    setTemplates(Array.isArray(tmpl) ? tmpl : []);
    if (sett && typeof sett === 'object') setSettings(s => ({ ...s, ...sett }));
  }

  useEffect(() => { load(); }, [date]);

  function shiftDate(n: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().split('T')[0]);
  }

  async function addMeal() {
    if (!form.name.trim()) return;
    const body = {
      name: form.name, meal_type: form.meal_type, date,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    };
    const r = await fetch('/api/nutrition', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success('Meal logged');
      setForm({ name: '', meal_type: 'lunch', calories: '', protein: '', carbs: '', fat: '' });
      setOpen(false);
      load();
    } else toast.error('Failed');
  }

  async function deleteMeal(id: number) {
    await fetch(`/api/nutrition/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Deleted');
  }

  function applyTemplate(t: any) {
    setForm({
      name: t.name,
      meal_type: form.meal_type,
      calories: String(t.calories || ''),
      protein: String(t.protein || ''),
      carbs: String(t.carbs || ''),
      fat: String(t.fat || ''),
    });
  }

  const totalCals = entries.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = entries.reduce((s, e) => s + (e.protein || 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs || 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat || 0), 0);
  const calTarget = Number(settings.calorie_target) || 2000;

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (selectedCategory !== 'all') {
      list = list.filter(t => categorize(t.name) === selectedCategory);
    }
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [templates, selectedCategory, templateSearch]);

  const dateLabel = date === today()
    ? 'Today'
    : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const calPct = Math.min((totalCals / calTarget) * 100, 100);
  const remaining = Math.max(calTarget - totalCals, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="page-header">{dateLabel}</h1>
            {date !== today() && <p className="text-xs text-muted-foreground">{date}</p>}
          </div>
          <button
            onClick={() => shiftDate(1)}
            disabled={date >= today()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
              <Plus size={15} /> Log Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Log Meal</DialogTitle>
            </DialogHeader>

            {/* Template search */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search Indian recipes…"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                      selectedCategory === cat.key
                        ? 'bg-amber-500/20 text-amber-500 font-medium'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {filteredTemplates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="group flex flex-col text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all"
                    >
                      <span className="text-foreground/80 font-medium leading-tight">{t.name}</span>
                      <span className="text-muted-foreground">{t.calories} kcal · P{t.protein}g · C{t.carbs}g · F{t.fat}g</span>
                    </button>
                  ))}
                </div>
              )}
              {templateSearch && filteredTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No match — fill in nutrition manually below. It will be saved for next time.
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Meal Name</Label>
                  <Input className="mt-1" placeholder="e.g. Dal Tadka" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Meal Type</Label>
                  <Select value={form.meal_type} onValueChange={v => setForm(f => ({ ...f, meal_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><Label className="text-xs">kcal</Label><Input type="number" className="mt-1" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} /></div>
                <div><Label className="text-xs">Protein (g)</Label><Input type="number" className="mt-1" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} /></div>
                <div><Label className="text-xs">Carbs (g)</Label><Input type="number" className="mt-1" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} /></div>
                <div><Label className="text-xs">Fat (g)</Label><Input type="number" className="mt-1" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={addMeal}>
                  Log Meal
                </Button>
                {form.name && form.calories && (
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={async () => {
                      const body = { name: form.name, calories: Number(form.calories) || 0, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 };
                      const r = await fetch('/api/nutrition/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                      if (r.ok) { toast.success('Saved as template'); load(); }
                    }}
                  >
                    Save Template
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calorie summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Ring */}
        <div className="md:col-span-2 module-card flex items-center gap-5">
          <div className="relative shrink-0">
            <RingProgress value={calPct} size={110} color="#fbbf24" label={`${totalCals}`} sublabel="kcal" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
              <span>Target</span>
              <span className="text-foreground font-medium">{calTarget} kcal</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Remaining</span>
              <span className="text-foreground font-medium">{remaining} kcal</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Meals</span>
              <span className="text-foreground font-medium">{entries.length}</span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="md:col-span-3 module-card flex flex-col justify-center gap-3">
          {[
            { label: 'Protein', val: totalProtein, target: Number(settings.protein_target) || 150, color: MACRO_COLORS.protein },
            { label: 'Carbs', val: totalCarbs, target: Number(settings.carbs_target) || 250, color: MACRO_COLORS.carbs },
            { label: 'Fat', val: totalFat, target: Number(settings.fat_target) || 65, color: MACRO_COLORS.fat },
          ].map(({ label, val, target, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="text-foreground tabular-nums">
                  <span className="font-semibold">{Math.round(val)}</span>
                  <span className="text-muted-foreground"> / {target}g</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((val / target) * 100, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals by type */}
      <div className="space-y-5">
        {MEAL_TYPES.map(type => {
          const meals = entries.filter(e => e.meal_type === type);
          if (meals.length === 0) return null;
          const meta = MEAL_META[type];
          const typeCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{typeCals} kcal</span>
              </div>
              <div className="space-y-1.5">
                {meals.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card group hover:bg-secondary/40 transition-colors"
                  >
                    <span className="flex-1 text-sm text-foreground">{m.name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.calories} kcal</span>
                      {m.protein > 0 && <span>P {Math.round(m.protein)}g</span>}
                      {m.carbs > 0 && <span>C {Math.round(m.carbs)}g</span>}
                      {m.fat > 0 && <span>F {Math.round(m.fat)}g</span>}
                    </div>
                    <button
                      onClick={() => deleteMeal(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="module-card py-14 text-center">
            <UtensilsCrossed size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No meals logged for {dateLabel}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Log Meal" to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
