'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, FolderOpen, Circle, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import { today } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = { P1: 'bg-red-500/20 text-red-400 border-red-500/30', P2: 'bg-orange-500/20 text-orange-400 border-orange-500/30', P3: 'bg-blue-500/20 text-blue-400 border-blue-500/30', P4: 'bg-zinc-700 text-zinc-400 border-zinc-600' };
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
const STATUS_COLS = ['todo', 'in-progress', 'done'];

export function TasksClient() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'P3', due_date: '', estimated_minutes: '', project_id: '' });
  const [projName, setProjName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projError, setProjError] = useState('');

  async function load() {
    const [p, t] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]);
    setProjects(Array.isArray(p) ? p : []);
    setTasks(Array.isArray(t) ? t : []);
  }

  useEffect(() => { load(); }, []);

  const filtered = selectedProject ? tasks.filter(t => t.project_id === selectedProject) : tasks;
  const todayTasks = tasks.filter(t => t.due_date === today() && t.status !== 'done');

  async function addTask() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length > 200) e.title = 'Max 200 characters';
    if (form.estimated_minutes) {
      const m = Number(form.estimated_minutes);
      if (isNaN(m) || m < 1) e.estimated_minutes = 'Must be at least 1 minute';
      else if (m > 1440) e.estimated_minutes = 'Max 1440 min (24 h)';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const body: any = { title: form.title.trim(), priority: form.priority };
    if (form.due_date) body.due_date = form.due_date;
    if (form.estimated_minutes) body.estimated_minutes = Number(form.estimated_minutes);
    if (form.project_id) body.project_id = Number(form.project_id);
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      const newTask = await r.json();
      setTasks(prev => [...prev, newTask]);
      toast.success('Task added');
      setForm({ title: '', priority: 'P3', due_date: '', estimated_minutes: '', project_id: '' });
      setErrors({});
      setAddOpen(false);
    } else toast.error('Failed to add task');
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Deleted');
  }

  async function addProject() {
    if (!projName.trim()) { setProjError('Project name is required'); return; }
    if (projName.length > 100) { setProjError('Max 100 characters'); return; }
    setProjError('');
    const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: projName.trim() }) });
    if (r.ok) { toast.success('Project created'); setProjName(''); setProjOpen(false); load(); }
    else toast.error('Failed to create project');
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 h-full">
      {/* Sidebar */}
      <div className="w-48 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Projects</h2>
          <Dialog open={projOpen} onOpenChange={setProjOpen}>
            <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><Plus size={14} /></Button></DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
              <div>
                <Input
                  placeholder="Project name"
                  value={projName}
                  onChange={e => { setProjName(e.target.value); setProjError(''); }}
                  onKeyDown={e => e.key === 'Enter' && addProject()}
                  className={projError ? 'border-red-500' : ''}
                />
                {projError && <p className="text-xs text-red-400 mt-0.5">{projError}</p>}
              </div>
              <Button onClick={addProject}>Create</Button>
            </DialogContent>
          </Dialog>
        </div>
        <button onClick={() => setSelectedProject(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedProject === null ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800'}`}>
          All Tasks
        </button>
        {projects.map(p => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedProject === p.id ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800'}`}>
            <FolderOpen size={14} />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-zinc-100">Tasks</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1"><Plus size={16} />Add Task</Button></DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title <span className="text-red-400">*</span></Label>
                  <Input
                    placeholder="Task title…"
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(v => ({ ...v, title: '' })); }}
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-xs text-red-400 mt-0.5">{errors.title}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['P1','P2','P3','P4'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Project</Label>
                    <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Est. Minutes</Label>
                    <Input
                      type="number" min="1" max="1440" placeholder="30"
                      value={form.estimated_minutes}
                      onChange={e => { setForm(f => ({ ...f, estimated_minutes: e.target.value })); setErrors(v => ({ ...v, estimated_minutes: '' })); }}
                      className={errors.estimated_minutes ? 'border-red-500' : ''}
                    />
                    {errors.estimated_minutes && <p className="text-xs text-red-400 mt-0.5">{errors.estimated_minutes}</p>}
                  </div>
                </div>
                <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={addTask}>Add Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="kanban">
          <TabsList className="mb-4">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <div className="grid grid-cols-3 gap-4">
              {STATUS_COLS.map(status => {
                const col = filtered.filter(t => t.status === status);
                return (
                  <div key={status} className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      {status === 'todo' && <Circle size={14} className="text-zinc-500" />}
                      {status === 'in-progress' && <ArrowRight size={14} className="text-blue-400" />}
                      {status === 'done' && <CheckCircle2 size={14} className="text-emerald-400" />}
                      <span className="text-sm font-medium text-zinc-300">{STATUS_LABELS[status]}</span>
                      <span className="ml-auto text-xs text-zinc-500">{col.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.map(t => (
                        <div key={t.id} className="bg-zinc-800 rounded-lg p-3 group">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm text-zinc-200 flex-1 ${t.status === 'done' ? 'line-through text-zinc-500' : ''}`}>{t.title}</p>
                            <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`text-xs border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                            {t.due_date && <span className="text-xs text-zinc-500">{t.due_date}</span>}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {STATUS_COLS.filter(s => s !== status).map(s => (
                              <button key={s} onClick={() => updateStatus(t.id, s)} className="text-xs text-zinc-500 hover:text-violet-400 transition-colors">→{STATUS_LABELS[s].split(' ')[0]}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-1">
              {filtered.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">No tasks</p>}
              {filtered.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 group hover:border-zinc-700 transition-colors">
                  <Badge className={`text-xs border w-10 text-center ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                  <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{t.title}</span>
                  {t.due_date && <span className="text-xs text-zinc-500">{t.due_date}</span>}
                  <Select value={t.status} onValueChange={v => updateStatus(t.id, v)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_COLS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="today">
            <div className="space-y-1">
              {todayTasks.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">No tasks due today</p>}
              {todayTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <Badge className={`text-xs border w-10 text-center ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                  <span className="flex-1 text-sm text-zinc-200">{t.title}</span>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateStatus(t.id, 'done')}>Done</Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
