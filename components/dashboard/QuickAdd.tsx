'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { today } from '@/lib/utils';

export function QuickAdd({ onClose }: { onClose: () => void }) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('P3');
  const [mealName, setMealName] = useState('');
  const [mealCals, setMealCals] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [habitName, setHabitName] = useState('');
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');

  async function addTask() {
    if (!taskTitle.trim()) return;
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: taskTitle, priority: taskPriority }) });
    if (r.ok) { toast.success('Task added'); setTaskTitle(''); onClose(); }
    else toast.error('Failed to add task');
  }

  async function addMeal() {
    if (!mealName.trim()) return;
    const r = await fetch('/api/nutrition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: mealName, meal_type: mealType, calories: Number(mealCals) || 0, date: today() }) });
    if (r.ok) { toast.success('Meal logged'); setMealName(''); setMealCals(''); onClose(); }
    else toast.error('Failed to log meal');
  }

  async function addHabit() {
    if (!habitName.trim()) return;
    const r = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: habitName, frequency: 'daily' }) });
    if (r.ok) { toast.success('Habit created'); setHabitName(''); onClose(); }
    else toast.error('Failed to create habit');
  }

  async function logSleep() {
    const r = await fetch('/api/sleep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: today(), bedtime, wake_time: wakeTime, quality: 3 }) });
    if (r.ok) { toast.success('Sleep logged'); onClose(); }
    else toast.error('Failed to log sleep');
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl">
      <Tabs defaultValue="task">
        <TabsList className="mb-4">
          <TabsTrigger value="task">Task</TabsTrigger>
          <TabsTrigger value="meal">Meal</TabsTrigger>
          <TabsTrigger value="habit">Habit</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
        </TabsList>
        <TabsContent value="task" className="flex gap-2">
          <Input placeholder="Task title…" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} className="flex-1" />
          <Select value={taskPriority} onValueChange={setTaskPriority}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['P1','P2','P3','P4'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addTask} size="sm">Add</Button>
        </TabsContent>
        <TabsContent value="meal" className="flex gap-2">
          <Input placeholder="Meal name…" value={mealName} onChange={e => setMealName(e.target.value)} className="flex-1" />
          <Input placeholder="kcal" type="number" value={mealCals} onChange={e => setMealCals(e.target.value)} className="w-20" />
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['breakfast','lunch','dinner','snack'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addMeal} size="sm">Log</Button>
        </TabsContent>
        <TabsContent value="habit" className="flex gap-2">
          <Input placeholder="Habit name…" value={habitName} onChange={e => setHabitName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} className="flex-1" />
          <Button onClick={addHabit} size="sm">Create</Button>
        </TabsContent>
        <TabsContent value="sleep" className="flex gap-2 items-center">
          <span className="text-sm text-zinc-400">Bed</span>
          <Input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="w-32" />
          <span className="text-sm text-zinc-400">Wake</span>
          <Input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className="w-32" />
          <Button onClick={logSleep} size="sm">Log</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
