'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Save, User, Utensils, Dumbbell, Moon } from 'lucide-react';

// [key, min, max] — undefined means no range constraint
const NUMERIC_RANGES: Record<string, [number, number]> = {
  age: [1, 120], height_cm: [50, 300], weight_kg: [20, 500], weight_goal_kg: [20, 500],
  calorie_target: [500, 10000], protein_target: [10, 500], carbs_target: [10, 1000],
  fat_target: [5, 500], water_target_ml: [200, 10000],
  workout_days_target: [0, 7], steps_target: [0, 100000],
  sleep_target: [1, 14],
};

const SECTIONS = [
  {
    key: 'profile',
    label: 'Profile',
    icon: User,
    color: 'text-zinc-400',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', placeholder: '25' },
      { key: 'height_cm', label: 'Height', type: 'number', unit: 'cm', placeholder: '170' },
      { key: 'weight_kg', label: 'Weight', type: 'number', unit: 'kg', placeholder: '70' },
      { key: 'week_start', label: 'Week Starts On', type: 'select', options: [{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }] },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    icon: Utensils,
    color: 'text-amber-400',
    fields: [
      { key: 'calorie_target', label: 'Daily Calories', type: 'number', unit: 'kcal', placeholder: '2000' },
      { key: 'protein_target', label: 'Protein', type: 'number', unit: 'g', placeholder: '150' },
      { key: 'carbs_target', label: 'Carbs', type: 'number', unit: 'g', placeholder: '250' },
      { key: 'fat_target', label: 'Fat', type: 'number', unit: 'g', placeholder: '65' },
      { key: 'water_target_ml', label: 'Water Intake', type: 'number', unit: 'ml', placeholder: '2500' },
    ],
  },
  {
    key: 'fitness',
    label: 'Fitness',
    icon: Dumbbell,
    color: 'text-red-400',
    fields: [
      { key: 'workout_days_target', label: 'Workout Days / Week', type: 'number', unit: 'days', placeholder: '4' },
      { key: 'steps_target', label: 'Daily Steps Goal', type: 'number', unit: 'steps', placeholder: '10000' },
      { key: 'weight_goal_kg', label: 'Goal Weight', type: 'number', unit: 'kg', placeholder: '65' },
    ],
  },
  {
    key: 'sleep',
    label: 'Sleep',
    icon: Moon,
    color: 'text-slate-400',
    fields: [
      { key: 'sleep_target', label: 'Sleep Target', type: 'number', unit: 'hours', placeholder: '8' },
      { key: 'default_bedtime', label: 'Default Bedtime', type: 'time', placeholder: '22:30' },
      { key: 'default_wake_time', label: 'Default Wake Time', type: 'time', placeholder: '06:30' },
    ],
  },
];

export function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(setSettings); }, []);

  const set = (key: string, val: string) => {
    setSettings(s => ({ ...s, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    for (const [key, [min, max]] of Object.entries(NUMERIC_RANGES)) {
      const raw = settings[key];
      if (!raw && raw !== '0') continue; // optional field left blank — fine
      const n = Number(raw);
      if (isNaN(n)) { e[key] = 'Must be a number'; continue; }
      if (n < min || n > max) e[key] = `Must be between ${min} and ${max}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) { toast.error('Fix the errors before saving'); return; }
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast.success('Settings saved');
    else toast.error('Failed to save');
    setSaving(false);
  };

  const exportData = () => { window.open('/api/export', '_blank'); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 text-sm">Configure your profile, targets and preferences</p>
      </div>

      {SECTIONS.map(section => (
        <Card key={section.key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <section.icon size={16} className={section.color} />
              {section.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map(f => (
              <div key={f.key}>
                <Label className="text-sm text-zinc-300">
                  {f.label}
                  {'unit' in f && f.unit && (
                    <span className="text-zinc-500 ml-1">({f.unit})</span>
                  )}
                </Label>
                {f.type === 'select' && 'options' in f ? (
                  <Select value={settings[f.key] || ''} onValueChange={v => set(f.key, v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {f.options!.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      type={f.type}
                      placeholder={'placeholder' in f ? f.placeholder : ''}
                      value={settings[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      className={`mt-1 ${errors[f.key] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {errors[f.key] && <p className="text-xs text-red-400 mt-0.5">{errors[f.key]}</p>}
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving} className="flex-1">
          <Save size={16} className="mr-2" />{saving ? 'Saving…' : 'Save Settings'}
        </Button>
        <Button onClick={exportData} variant="outline" className="flex-1">
          <Download size={16} className="mr-2" />Export All Data (JSON)
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base text-zinc-400">About Life OS</CardTitle></CardHeader>
        <CardContent className="text-sm text-zinc-500 space-y-1">
          <p>All data stored locally in <code className="bg-zinc-900 px-1 rounded">./data/lifeos.db</code></p>
          <p>No internet connection required. No accounts. No tracking.</p>
          <p>Export your data anytime as JSON for backup or migration.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
