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
import { ChevronLeft, ChevronRight, Plus, Trash2, Search, UtensilsCrossed, Sparkles, Link, ExternalLink } from 'lucide-react';
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
  const [estimating, setEstimating] = useState(false);
  const [estimateConfidence, setEstimateConfidence] = useState<'high'|'medium'|'low'|null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    const [ents, tmpl, sett] = await Promise.all([
      fetch(`/api/nutrition?date=${date}`).then(r => r.json()),
      fetch('/api/nutrition/templates').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]);
    // GET returns { meals, totals, targets } — extract meals array
    const meals = Array.isArray(ents) ? ents : (Array.isArray(ents?.meals) ? ents.meals : []);
    setEntries(meals);
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
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Meal name is required';
    else if (form.name.length > 150) e.name = 'Max 150 characters';
    const cal = Number(form.calories);
    if (!form.calories) e.calories = 'Calories are required';
    else if (isNaN(cal) || cal < 0) e.calories = 'Must be 0 or more';
    else if (cal > 5000) e.calories = 'Max 5000 kcal per entry';
    for (const [field, label] of [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']] as const) {
      const v = Number(form[field]);
      if (form[field] && (isNaN(v) || v < 0)) e[field] = `${label} must be 0 or more`;
      else if (v > 500) e[field] = `${label} max 500g`;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const body = {
      name: form.name.trim(), meal_type: form.meal_type, date,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    };
    const r = await fetch('/api/nutrition', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (r.ok) {
      const newEntry = await r.json();
      setEntries(prev => [...prev, newEntry]);
      toast.success('Meal logged');
      resetForm();
      setOpen(false);
    } else toast.error('Failed');
  }

  function resetForm() {
    setForm({ name: '', meal_type: 'lunch', calories: '', protein: '', carbs: '', fat: '' });
    setEstimateConfidence(null);
    setSourceUrl('');
    setShowUrlInput(false);
    setErrors({});
  }

  async function estimateNutrition() {
    if (!form.name.trim()) return;
    setEstimating(true);
    setEstimateConfidence(null);
    try {
      const r = await fetch(`/api/nutrition/estimate?name=${encodeURIComponent(form.name)}`);
      const data = await r.json();
      setForm(f => ({
        ...f,
        calories: String(data.calories),
        protein: String(data.protein),
        carbs: String(data.carbs),
        fat: String(data.fat),
      }));
      setEstimateConfidence(data.confidence);
      const msg = data.confidence === 'high'
        ? 'Found in database'
        : data.confidence === 'medium'
          ? `Matched "${data.matched}" — verify if needed`
          : 'Estimated from keywords — please verify';
      toast.info(msg);
    } catch {
      toast.error('Could not estimate');
    }
    setEstimating(false);
  }

  async function saveAsTemplate() {
    if (!form.name.trim() || !form.calories) return;
    const r = await fetch('/api/nutrition/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        source_url: sourceUrl,
      }),
    });
    if (r.ok) {
      const saved = await r.json();
      setTemplates(prev => {
        const exists = prev.find(t => t.id === saved.id);
        return exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved];
      });
      toast.success('Saved as template');
    }
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
    setEstimateConfidence(null);
    if (t.source_url) { setSourceUrl(t.source_url); setShowUrlInput(true); }
    else { setSourceUrl(''); setShowUrlInput(false); }
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

        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
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
                      <div className="flex items-center gap-1">
                        <span className="text-foreground/80 font-medium leading-tight">{t.name}</span>
                        {t.source_url && (
                          <a
                            href={t.source_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-amber-500/60 hover:text-amber-400 transition-colors"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <span className="text-muted-foreground">{t.calories} kcal · P{t.protein}g · C{t.carbs}g · F{t.fat}g</span>
                    </button>
                  ))}
                </div>
              )}
              {templateSearch && filteredTemplates.length === 0 && (
                <div className="py-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No match in recipes — type the name above and estimate nutrition automatically, or fill in manually.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      disabled={!templateSearch.trim() || estimating}
                      onClick={() => {
                        setForm(f => ({ ...f, name: templateSearch }));
                        setTimeout(estimateNutrition, 0);
                      }}
                    >
                      <Sparkles size={12} />
                      {estimating ? 'Estimating…' : 'Auto-estimate nutrition'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs text-muted-foreground"
                      onClick={() => { setShowUrlInput(v => !v); }}
                    >
                      <Link size={12} />
                      Add recipe URL
                    </Button>
                  </div>
                  {showUrlInput && (
                    <div className="flex gap-2 items-center">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="https://… (saved with template for reference)"
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                      />
                      {sourceUrl && (
                        <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Meal Name</Label>
                    {estimateConfidence && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        estimateConfidence === 'high' ? 'bg-green-500/15 text-green-400' :
                        estimateConfidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {estimateConfidence === 'high' ? 'from DB' : estimateConfidence === 'medium' ? 'approximate' : 'estimated'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Input
                      className={`flex-1 ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="e.g. Dal Tadka"
                      value={form.name}
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setEstimateConfidence(null); setErrors(v => ({ ...v, name: '' })); }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      disabled={!form.name.trim() || estimating}
                      onClick={estimateNutrition}
                      title="Auto-estimate nutrition"
                    >
                      <Sparkles size={13} />
                    </Button>
                  </div>
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
                <div>
                  <Label className="text-xs">kcal <span className="text-red-400">*</span></Label>
                  <Input type="number" min="0" className={`mt-1 ${errors.calories ? 'border-red-500' : ''}`} value={form.calories} onChange={e => { setForm(f => ({ ...f, calories: e.target.value })); setErrors(v => ({ ...v, calories: '' })); }} />
                  {errors.calories && <p className="text-xs text-red-400 mt-0.5 leading-tight">{errors.calories}</p>}
                </div>
                <div>
                  <Label className="text-xs">Protein (g)</Label>
                  <Input type="number" min="0" className={`mt-1 ${errors.protein ? 'border-red-500' : ''}`} value={form.protein} onChange={e => { setForm(f => ({ ...f, protein: e.target.value })); setErrors(v => ({ ...v, protein: '' })); }} />
                  {errors.protein && <p className="text-xs text-red-400 mt-0.5 leading-tight">{errors.protein}</p>}
                </div>
                <div>
                  <Label className="text-xs">Carbs (g)</Label>
                  <Input type="number" min="0" className={`mt-1 ${errors.carbs ? 'border-red-500' : ''}`} value={form.carbs} onChange={e => { setForm(f => ({ ...f, carbs: e.target.value })); setErrors(v => ({ ...v, carbs: '' })); }} />
                  {errors.carbs && <p className="text-xs text-red-400 mt-0.5 leading-tight">{errors.carbs}</p>}
                </div>
                <div>
                  <Label className="text-xs">Fat (g)</Label>
                  <Input type="number" min="0" className={`mt-1 ${errors.fat ? 'border-red-500' : ''}`} value={form.fat} onChange={e => { setForm(f => ({ ...f, fat: e.target.value })); setErrors(v => ({ ...v, fat: '' })); }} />
                  {errors.fat && <p className="text-xs text-red-400 mt-0.5 leading-tight">{errors.fat}</p>}
                </div>
              </div>

              {/* URL field — shown if url was added from "no match" section or from template */}
              {showUrlInput && (
                <div>
                  <Label className="text-xs text-muted-foreground">Recipe URL (optional, saved with template)</Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      className="flex-1 h-8 text-xs"
                      placeholder="https://…"
                      value={sourceUrl}
                      onChange={e => setSourceUrl(e.target.value)}
                    />
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noreferrer"
                        className="flex items-center px-2 rounded border border-border text-muted-foreground hover:text-amber-400 transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={addMeal}>
                  Log Meal
                </Button>
                {form.name && form.calories && (
                  <Button variant="outline" className="text-xs gap-1" onClick={saveAsTemplate}>
                    Save as Template
                  </Button>
                )}
                {!showUrlInput && (
                  <Button variant="ghost" className="text-xs px-2 text-muted-foreground" onClick={() => setShowUrlInput(true)} title="Add recipe URL">
                    <Link size={13} />
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
