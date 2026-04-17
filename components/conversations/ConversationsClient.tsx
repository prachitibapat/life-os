'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, MessageCircle } from 'lucide-react';

const PROMPTS = [
  "Argue both sides of: 'Social media does more harm than good'",
  "Tell a 2-minute story about a challenge you overcame",
  "Explain a complex topic to someone with no background in it",
  "Practice active listening: summarize what someone just told you",
  "Debate: 'Failure is essential for success'",
  "Ask 3 open-ended questions about something someone cares about",
  "Describe your day using only sensory details",
  "Argue the opposite of your actual opinion on any topic",
];

export function ConversationsClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [prompts] = useState(() => PROMPTS.sort(()=>Math.random()-0.5).slice(0,3));
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], context:'', what_went_well:'', what_to_improve:'', key_insight:'', growth_areas:'' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetch('/api/conversations').then(r=>r.json()).then(setLogs); }, []);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.context.trim()) e.context = 'Context is required (e.g. "Team meeting", "1:1 with mentor")';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const res = await fetch('/api/conversations', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, context: form.context.trim(), growth_areas: form.growth_areas.split(',').map(s=>s.trim()).filter(Boolean) }) });
    if (res.ok) { const d = await res.json(); setLogs([d,...logs]); setOpen(false); setErrors({}); toast.success('Logged'); }
    else toast.error('Failed to log conversation');
  };

  const del = async (id: number) => {
    await fetch(`/api/conversations/${id}`, { method:'DELETE' });
    setLogs(logs.filter(l=>l.id!==id));
  };

  const allGrowthAreas = Array.from(new Set(logs.flatMap(l => { try { return JSON.parse(l.growth_areas||'[]'); } catch { return []; } })));

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'#6366F1'}}>Conversations</h1>
          <p className="text-zinc-400 text-sm">Reflect on interactions, grow your skills</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{backgroundColor:'#6366F1'}}><Plus size={16} className="mr-2"/>Log Conversation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Conversation Reflection</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date <span className="text-red-400">*</span></Label>
                  <Input type="date" value={form.date} onChange={e=>{setForm({...form,date:e.target.value});setErrors(v=>({...v,date:''}));}} className={errors.date?'border-red-500':''} />
                  {errors.date && <p className="text-xs text-red-400 mt-0.5">{errors.date}</p>}
                </div>
                <div>
                  <Label>Context <span className="text-red-400">*</span></Label>
                  <Input value={form.context} onChange={e=>{setForm({...form,context:e.target.value});setErrors(v=>({...v,context:''}));}} placeholder="Team meeting, 1:1, etc." className={errors.context?'border-red-500':''} />
                  {errors.context && <p className="text-xs text-red-400 mt-0.5">{errors.context}</p>}
                </div>
              </div>
              <div><Label>What went well?</Label><Textarea rows={2} value={form.what_went_well} onChange={e=>setForm({...form,what_went_well:e.target.value})} /></div>
              <div><Label>What could I improve?</Label><Textarea rows={2} value={form.what_to_improve} onChange={e=>setForm({...form,what_to_improve:e.target.value})} /></div>
              <div><Label>Key insight</Label><Textarea rows={2} value={form.key_insight} onChange={e=>setForm({...form,key_insight:e.target.value})} /></div>
              <div><Label>Growth areas (comma-separated)</Label><Input value={form.growth_areas} onChange={e=>setForm({...form,growth_areas:e.target.value})} placeholder="conciseness, active listening" /></div>
              <Button onClick={save} className="w-full" style={{backgroundColor:'#6366F1'}}>Save Reflection</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {logs.map(log=>(
            <Card key={log.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle size={14} style={{color:'#6366F1'}}/>
                      <span className="text-sm font-medium">{log.context || 'Conversation'}</span>
                      <span className="text-xs text-zinc-500">{log.date}</span>
                    </div>
                    {log.what_went_well && <p className="text-xs text-green-400 mb-1">✓ {log.what_went_well}</p>}
                    {log.what_to_improve && <p className="text-xs text-yellow-400 mb-1">↑ {log.what_to_improve}</p>}
                    {log.key_insight && <p className="text-xs text-zinc-400 italic">"{log.key_insight}"</p>}
                  </div>
                  <button onClick={()=>del(log.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
              </CardContent>
            </Card>
          ))}
          {logs.length===0 && <p className="text-center text-zinc-500 py-8">No conversations logged yet.</p>}
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 text-sm">Practice Prompts</h3>
              <div className="space-y-2">
                {prompts.map((p,i)=>(
                  <div key={i} className="p-2 bg-zinc-900 rounded text-xs text-zinc-300 border-l-2" style={{borderColor:'#6366F1'}}>{p}</div>
                ))}
              </div>
            </CardContent>
          </Card>
          {allGrowthAreas.length>0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 text-sm">Growth Areas</h3>
                <div className="flex flex-wrap gap-1">
                  {allGrowthAreas.map((a:any,i)=><Badge key={i} variant="outline" className="text-xs">{a}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
