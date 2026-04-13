'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Flame, Dumbbell, Moon, UtensilsCrossed, BookOpen, RefreshCw } from 'lucide-react';

export function WeeklyReviewClient() {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ wins:'', drains:'', next_week_focus:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/weekly-review').then(r=>r.json()).then(d=>{
      setData(d);
      if (d.review) setForm({ wins: d.review.wins||'', drains: d.review.drains||'', next_week_focus: d.review.next_week_focus||'' });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/weekly-review', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ week_start: data.weekStart, ...form, auto_summary: data.autoSummary }) });
    if (res.ok) { toast.success('Review saved'); }
    else toast.error('Failed');
    setSaving(false);
  };

  if (!data) return <div className="text-zinc-500 p-8">Loading...</div>;

  const s = data.autoSummary;
  const stats = [
    { icon: CheckSquare, label:'Tasks Done', value: s.tasks_done, color:'#8B5CF6' },
    { icon: Flame, label:'Habits', value:`${s.habits_rate}%`, color:'#10B981' },
    { icon: Dumbbell, label:'Workouts', value: s.workouts, color:'#EF4444' },
    { icon: Moon, label:'Avg Sleep', value:`${s.avg_sleep}h`, color:'#64748B' },
    { icon: UtensilsCrossed, label:'Avg Calories', value: s.avg_calories, color:'#F59E0B' },
    { icon: BookOpen, label:'Journal Days', value: s.journal_days, color:'#EC4899' },
  ];

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'#7C3AED'}}>Weekly Review</h1>
          <p className="text-zinc-400 text-sm">{data.weekStart} → {data.weekEnd}</p>
        </div>
        <Button onClick={save} disabled={saving} style={{backgroundColor:'#7C3AED'}}>
          <RefreshCw size={16} className="mr-2"/>{saving?'Saving...':'Save Review'}
        </Button>
      </div>

      {/* Auto summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat=>(
          <Card key={stat.label}>
            <CardContent className="pt-4 text-center">
              <stat.icon size={18} className="mx-auto mb-1" style={{color:stat.color}}/>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reflection prompts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key:'wins', label:'🏆 What were my wins?', placeholder:'What did you accomplish, learn, or do well this week?' },
          { key:'drains', label:'🔋 What drained me?', placeholder:'What took energy? What would you do differently?' },
          { key:'next_week_focus', label:'🎯 Focus for next week', placeholder:'One clear priority or intention for the coming week...' },
        ].map(p=>(
          <Card key={p.key}>
            <CardHeader><CardTitle className="text-sm">{p.label}</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={5} placeholder={p.placeholder}
                value={(form as any)[p.key]}
                onChange={e=>setForm({...form,[p.key]:e.target.value})} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      {data.history?.length>0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Past Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.history.filter((r:any)=>r.week_start!==data.weekStart).map((r:any)=>(
              <div key={r.id} className="p-3 bg-zinc-900 rounded text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{r.week_start}</Badge>
                </div>
                {r.wins && <p className="text-zinc-300 text-xs">🏆 {r.wins.slice(0,100)}{r.wins.length>100&&'...'}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
