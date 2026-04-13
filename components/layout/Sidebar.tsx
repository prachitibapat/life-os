'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CheckSquare, Flame, UtensilsCrossed, Dumbbell,
  BookOpen, Brain, MessageCircle, Moon, RefreshCw, Settings, Timer,
  ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { useState } from 'react';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#818cf8' },
      { href: '/tasks', icon: CheckSquare, label: 'Tasks', color: '#a78bfa' },
      { href: '/habits', icon: Flame, label: 'Habits', color: '#34d399' },
    ],
  },
  {
    label: 'Health',
    items: [
      { href: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition', color: '#fbbf24' },
      { href: '/fitness', icon: Dumbbell, label: 'Fitness', color: '#f87171' },
      { href: '/sleep', icon: Moon, label: 'Sleep', color: '#94a3b8' },
    ],
  },
  {
    label: 'Mind',
    items: [
      { href: '/journal', icon: BookOpen, label: 'Journal', color: '#f472b6' },
      { href: '/thinking', icon: Brain, label: 'Thinking', color: '#22d3ee' },
      { href: '/conversations', icon: MessageCircle, label: 'Convos', color: '#818cf8' },
    ],
  },
  {
    label: 'Review',
    items: [
      { href: '/weekly-review', icon: RefreshCw, label: 'Weekly Review', color: '#c084fc' },
      { href: '/pomodoro', icon: Timer, label: 'Pomodoro', color: '#fb923c' },
    ],
  },
];

const BOTTOM_NAV = [
  { href: '/settings', icon: Settings, label: 'Settings', color: '#9ca3af' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-card transition-all duration-300 shrink-0 relative',
        collapsed ? 'w-[56px]' : 'w-[220px]'
      )}
      style={{ boxShadow: '1px 0 0 hsl(var(--border))' }}
    >
      {/* Brand */}
      <div className={cn(
        'flex items-center border-b border-border h-14 px-3 shrink-0',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap size={14} className="text-primary" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-foreground">
              Life<span className="text-primary">OS</span>
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap size={14} className="text-primary" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'absolute -right-3 top-[52px] z-10 bg-card border border-border rounded-full p-0.5 w-6 h-6 flex items-center justify-center shadow-sm'
          )}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label, color }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                    style={active ? {
                      backgroundColor: color + '18',
                      color,
                    } : {}}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <Icon
                      size={16}
                      className={cn('shrink-0 transition-colors', !active && 'group-hover:text-foreground')}
                      style={active ? { color } : {}}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-0.5">
        {BOTTOM_NAV.map(({ href, icon: Icon, label, color }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              style={active ? { backgroundColor: color + '18', color } : {}}
            >
              <Icon size={16} className="shrink-0" style={active ? { color } : {}} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}

        {!collapsed && (
          <p className="text-[11px] text-muted-foreground/50 px-2 pt-2">{dateStr}</p>
        )}
      </div>
    </aside>
  );
}
