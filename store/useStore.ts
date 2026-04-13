import { create } from 'zustand';

interface AppStore {
  // Settings
  settings: Record<string, string>;
  setSettings: (s: Record<string, string>) => void;

  // Quick-add modal state
  quickAddOpen: boolean;
  quickAddType: string;
  openQuickAdd: (type?: string) => void;
  closeQuickAdd: () => void;
}

export const useStore = create<AppStore>((set) => ({
  settings: {},
  setSettings: (settings) => set({ settings }),
  quickAddOpen: false,
  quickAddType: 'task',
  openQuickAdd: (type = 'task') => set({ quickAddOpen: true, quickAddType: type }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}));
