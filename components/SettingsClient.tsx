'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Save } from 'lucide-react';

const FIELDS = [
  { key:'calorie_target', label:'Daily Calorie Target', unit:'kcal' },
  { key:'protein_target', label:'Daily Protein Target', unit:'g' },
  { key:'carbs_target', label:'Daily Carbs Target', unit:'g' },
  { key:'fat_target', label:'Daily Fat Target', unit:'g' },
  { key:'sleep_target', label:'Sleep Target', unit:'hours' },
  { key:'workout_days_target', label:'Workout Days / Week', unit:'days' },
];

export function SettingsClient() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/settings').then(r=>r.json()).then(setSettings); }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(settings) });
    if (res.ok) toast.success('Settings saved');
    else toast.error('Failed to save');
    setSaving(false);
  };

  const exportData = () => { window.open('/api/export', '_blank'); };

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 text-sm">Configure your daily targets and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily Targets</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map(f=>(
            <div key={f.key}>
              <Label>{f.label} <span className="text-zinc-500">({f.unit})</span></Label>
              <Input type="number" value={settings[f.key]||''} onChange={e=>setSettings({...settings,[f.key]:e.target.value})} className="mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving} className="flex-1">
          <Save size={16} className="mr-2"/>{saving?'Saving...':'Save Settings'}
        </Button>
        <Button onClick={exportData} variant="outline" className="flex-1">
          <Download size={16} className="mr-2"/>Export All Data (JSON)
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
