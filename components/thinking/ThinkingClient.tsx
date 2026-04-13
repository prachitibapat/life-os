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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Lightbulb } from 'lucide-react';

const CATEGORIES = ['general','philosophy','science','psychology','current events','technology','history','economics'];

export function ThinkingClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [form, setForm] = useState({ title:'', type:'article', source:'', summary:'', key_arguments:'', my_critique:'', rating:0, category:'general', tags:'' });

  useEffect(() => {
    fetch('/api/thinking').then(r=>r.json()).then(setLogs);
    fetch('/api/thinking/inbox').then(r=>r.json()).then(setInbox);
  }, []);

  const addLog = async () => {
    const res = await fetch('/api/thinking', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) }) });
    if (res.ok) { const d = await res.json(); setLogs([d,...logs]); setOpen(false); toast.success('Log added'); }
    else toast.error('Failed');
  };

  const addIdea = async () => {
    if (!idea.trim()) return;
    const res = await fetch('/api/thinking/inbox', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: idea }) });
    if (res.ok) { const d = await res.json(); setInbox([d,...inbox]); setIdea(''); toast.success('Idea captured'); }
  };

  const deleteIdea = async (id: number) => {
    await fetch('/api/thinking/inbox', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    setInbox(inbox.filter(i=>i.id!==id));
  };

  const deleteLog = async (id: number) => {
    await fetch(`/api/thinking/${id}`, { method:'DELETE' });
    setLogs(logs.filter(l=>l.id!==id));
    toast.success('Deleted');
  };

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'#06B6D4'}}>Critical Thinking</h1>
          <p className="text-zinc-400 text-sm">Engage deeply with ideas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{backgroundColor:'#06B6D4'}}><Plus size={16} className="mr-2"/>Add Log</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Thinking Log</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Book/article title" /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v=>setForm({...form,type:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['article','book','video','idea'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Source / Author</Label><Input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v=>setForm({...form,category:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Summary (in your words)</Label><Textarea rows={3} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} /></div>
              <div><Label>Key Arguments</Label><Textarea rows={2} value={form.key_arguments} onChange={e=>setForm({...form,key_arguments:e.target.value})} /></div>
              <div><Label>My Critique / Questions</Label><Textarea rows={2} value={form.my_critique} onChange={e=>setForm({...form,my_critique:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Rating (1-5)</Label>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setForm({...form,rating:n})} className={`text-xl ${n<=form.rating?'text-yellow-400':'text-zinc-600'}`}>★</button>
                    ))}
                  </div>
                </div>
                <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="bias, decision-making" /></div>
              </div>
              <Button onClick={addLog} className="w-full" style={{backgroundColor:'#06B6D4'}}>Save Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Idea Inbox */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-yellow-400"/><h3 className="font-semibold">Idea Inbox</h3>
            <Badge variant="secondary">{inbox.filter(i=>!i.processed).length} unprocessed</Badge>
          </div>
          <div className="flex gap-2 mb-3">
            <Input value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Capture a raw thought..." onKeyDown={e=>e.key==='Enter'&&addIdea()} />
            <Button onClick={addIdea} size="sm" variant="outline">Add</Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {inbox.map(item=>(
              <div key={item.id} className="flex items-start justify-between p-2 bg-zinc-900 rounded text-sm">
                <span className="text-zinc-300">{item.content}</span>
                <button onClick={()=>deleteIdea(item.id)} className="text-zinc-600 hover:text-red-400 ml-2 shrink-0"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <div className="space-y-3">
        {logs.map(log=>(
          <Card key={log.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-zinc-100">{log.title}</h3>
                    <Badge variant="outline">{log.type}</Badge>
                    <Badge variant="secondary">{log.category}</Badge>
                  </div>
                  {log.source && <p className="text-xs text-zinc-500 mb-2">by {log.source}</p>}
                  {log.rating>0 && <div className="flex mb-2">{[1,2,3,4,5].map(n=><span key={n} className={`text-sm ${n<=log.rating?'text-yellow-400':'text-zinc-700'}`}>★</span>)}</div>}
                  {log.summary && <p className="text-sm text-zinc-400 mb-1"><span className="text-zinc-500">Summary:</span> {log.summary}</p>}
                  {log.my_critique && <p className="text-sm text-zinc-400"><span className="text-zinc-500">Critique:</span> {log.my_critique}</p>}
                </div>
                <button onClick={()=>deleteLog(log.id)} className="text-zinc-600 hover:text-red-400 ml-3"><Trash2 size={14}/></button>
              </div>
            </CardContent>
          </Card>
        ))}
        {logs.length===0 && <p className="text-center text-zinc-500 py-8">No logs yet. Start engaging with ideas.</p>}
      </div>
    </motion.div>
  );
}
