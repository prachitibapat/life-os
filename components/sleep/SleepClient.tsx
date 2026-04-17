'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Moon, Sun } from 'lucide-react';

const QUALITY = ['','😴','😫','😐','🙂','✨'];

export function SleepClient() {
  const [data, setData] = useState<{logs:any[],average:number,target:number}>({logs:[],average:0,target:8});
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], bedtime:'22:30', wake_time:'06:30', quality:4, notes:'' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetch('/api/sleep?limit=14').then(r=>r.json()).then(setData); }, []);

  const calcDuration = (bed:string, wake:string) => {
    if (!bed||!wake) return 0;
    const [bh,bm] = bed.split(':').map(Number);
    const [wh,wm] = wake.split(':').map(Number);
    let mins = (wh*60+wm) - (bh*60+bm);
    if (mins<0) mins += 1440;
    return Math.round(mins/6)/10;
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.bedtime) e.bedtime = 'Bedtime is required';
    if (!form.wake_time) e.wake_time = 'Wake time is required';
    if (form.quality < 1 || form.quality > 5) e.quality = 'Quality must be between 1 and 5';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    const duration_hours = calcDuration(form.bedtime, form.wake_time);
    const res = await fetch('/api/sleep', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, duration_hours }) });
    if (res.ok) {
      const newLog = await res.json();
      toast.success('Sleep logged');
      setData(prev => {
        const logs = [newLog, ...prev.logs.filter((l: any) => l.date !== newLog.date)].slice(0, 14);
        const avg = logs.length ? logs.reduce((s: number, l: any) => s + l.duration_hours, 0) / logs.length : 0;
        return { ...prev, logs, average: Math.round(avg * 10) / 10 };
      });
    } else toast.error('Failed');
    setSaving(false);
  };

  const chartData = [...data.logs].reverse().map(l=>({
    date: l.date.slice(5),
    hours: l.duration_hours,
    quality: l.quality,
  }));

  const debt = Math.max(0, (data.target - data.average) * 7);

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{color:'#64748B'}}>Sleep</h1>
        <p className="text-zinc-400 text-sm">Track rest and recovery</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid grid-cols-3 gap-3 md:col-span-3">
          {[
            { label:'Avg Duration', value:`${data.average}h`, icon: Moon },
            { label:'Target', value:`${data.target}h`, icon: Sun },
            { label:'Weekly Debt', value:`${debt.toFixed(1)}h`, icon: Moon },
          ].map(s=>(
            <Card key={s.label}>
              <CardContent className="pt-4 flex items-center gap-3">
                <s.icon size={20} className="text-zinc-500"/>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-zinc-500">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Log form */}
        <Card>
          <CardHeader><CardTitle className="text-base">Log Sleep</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Date <span className="text-red-400">*</span></Label>
              <Input type="date" value={form.date} onChange={e=>{setForm({...form,date:e.target.value});setErrors(v=>({...v,date:''}));}} className={errors.date?'border-red-500':''} />
              {errors.date && <p className="text-xs text-red-400 mt-0.5">{errors.date}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Bedtime <span className="text-red-400">*</span></Label>
                <Input type="time" value={form.bedtime} onChange={e=>{setForm({...form,bedtime:e.target.value});setErrors(v=>({...v,bedtime:''}));}} className={errors.bedtime?'border-red-500':''} />
                {errors.bedtime && <p className="text-xs text-red-400 mt-0.5">{errors.bedtime}</p>}
              </div>
              <div>
                <Label>Wake time <span className="text-red-400">*</span></Label>
                <Input type="time" value={form.wake_time} onChange={e=>{setForm({...form,wake_time:e.target.value});setErrors(v=>({...v,wake_time:''}));}} className={errors.wake_time?'border-red-500':''} />
                {errors.wake_time && <p className="text-xs text-red-400 mt-0.5">{errors.wake_time}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Duration: {calcDuration(form.bedtime,form.wake_time)}h</p>
            </div>
            <div>
              <Label>Quality</Label>
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setForm({...form,quality:n})}
                    className={`text-xl transition-transform ${form.quality===n?'scale-125':''}`}>
                    {QUALITY[n]}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <Button onClick={save} disabled={saving} className="w-full" style={{backgroundColor:'#64748B'}}>
              {saving?'Saving...':'Log Sleep'}
            </Button>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Last 14 Days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={16}>
                <XAxis dataKey="date" tick={{fontSize:10}} stroke="#52525b" />
                <YAxis domain={[0,10]} tick={{fontSize:10}} stroke="#52525b" />
                <Tooltip contentStyle={{backgroundColor:'#18181b',border:'1px solid #27272a',fontSize:12}} />
                <ReferenceLine y={data.target} stroke="#64748B" strokeDasharray="4 2" />
                <Bar dataKey="hours" fill="#64748B" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* History table */}
        <Card className="md:col-span-3">
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead><tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left py-1">Date</th><th className="text-left">Bedtime</th>
                <th className="text-left">Wake</th><th className="text-left">Duration</th><th className="text-left">Quality</th>
              </tr></thead>
              <tbody>
                {data.logs.map(l=>(
                  <tr key={l.id} className="border-b border-zinc-900 text-zinc-300">
                    <td className="py-1.5">{l.date}</td>
                    <td>{l.bedtime}</td><td>{l.wake_time}</td>
                    <td>{l.duration_hours}h</td>
                    <td>{QUALITY[l.quality]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
