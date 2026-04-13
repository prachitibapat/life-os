import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// In the packaged Electron app, LIFEOS_DATA_DIR is set by the main process to
// the user's AppData/Roaming directory so the database survives updates/reinstalls.
// In dev (npm run dev), this env var is unset and we fall back to process.cwd()/data.
const DB_DIR = process.env.LIFEOS_DATA_DIR ?? path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'lifeos.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initSchema(db);
  seedIfEmpty(db);
  ensureTemplates(db);
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
      color TEXT DEFAULT '#8B5CF6', status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL,
      description TEXT, priority TEXT DEFAULT 'P3', status TEXT DEFAULT 'todo',
      due_date TEXT, tags TEXT DEFAULT '[]', estimated_minutes INTEGER,
      actual_minutes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
      frequency TEXT DEFAULT 'daily', target_count INTEGER DEFAULT 1,
      color TEXT DEFAULT '#10B981', icon TEXT DEFAULT '✓', is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL, completed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(habit_id, date)
    );
    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, meal_type TEXT DEFAULT 'lunch',
      name TEXT NOT NULL, calories INTEGER DEFAULT 0, protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0, fat REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meal_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, calories INTEGER DEFAULT 0,
      protein REAL DEFAULT 0, carbs REAL DEFAULT 0, fat REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, name TEXT NOT NULL,
      type TEXT DEFAULT 'strength', notes TEXT, duration_minutes INTEGER DEFAULT 0,
      template_id INTEGER, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL, muscle_group TEXT, sets INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0, weight REAL DEFAULT 0, duration_seconds INTEGER DEFAULT 0,
      distance_km REAL DEFAULT 0, notes TEXT, order_index INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT DEFAULT 'strength',
      exercises TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, exercise_name TEXT NOT NULL UNIQUE,
      value REAL NOT NULL, unit TEXT DEFAULT 'kg', date TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT '', mood INTEGER CHECK(mood BETWEEN 1 AND 5),
      what_went_well TEXT DEFAULT '', what_to_change TEXT DEFAULT '', gratitude TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS thinking_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT DEFAULT 'article',
      source TEXT DEFAULT '', summary TEXT DEFAULT '', key_arguments TEXT DEFAULT '',
      my_critique TEXT DEFAULT '', rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      tags TEXT DEFAULT '[]', category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS idea_inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL,
      processed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, context TEXT DEFAULT '',
      what_went_well TEXT DEFAULT '', what_to_improve TEXT DEFAULT '',
      key_insight TEXT DEFAULT '', growth_areas TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
      bedtime TEXT DEFAULT '', wake_time TEXT DEFAULT '',
      quality INTEGER CHECK(quality BETWEEN 1 AND 5),
      duration_hours REAL DEFAULT 0, notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, week_start TEXT NOT NULL UNIQUE,
      wins TEXT DEFAULT '', drains TEXT DEFAULT '', next_week_focus TEXT DEFAULT '',
      auto_summary TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function r(id: bigint | number): number { return Number(id); }

// Fitness templates: [name, type, exercises[]]
const FITNESS_TEMPLATES = [
  ['Push Day A', 'strength', [
    {name:'Bench Press',muscle_group:'chest',sets:4,reps:8,weight:80},
    {name:'Overhead Press',muscle_group:'shoulders',sets:3,reps:10,weight:50},
    {name:'Incline DB Press',muscle_group:'chest',sets:3,reps:12,weight:30},
    {name:'Tricep Dips',muscle_group:'triceps',sets:3,reps:12,weight:0},
    {name:'Lateral Raises',muscle_group:'shoulders',sets:3,reps:15,weight:12},
  ]],
  ['Pull Day A', 'strength', [
    {name:'Pull-ups',muscle_group:'back',sets:4,reps:8,weight:0},
    {name:'Barbell Row',muscle_group:'back',sets:4,reps:8,weight:70},
    {name:'Cable Row',muscle_group:'back',sets:3,reps:12,weight:55},
    {name:'Face Pull',muscle_group:'rear delts',sets:3,reps:15,weight:20},
    {name:'Barbell Curl',muscle_group:'biceps',sets:3,reps:12,weight:35},
    {name:'Hammer Curl',muscle_group:'biceps',sets:3,reps:12,weight:15},
  ]],
  ['Legs Day A', 'strength', [
    {name:'Back Squat',muscle_group:'quads',sets:4,reps:6,weight:100},
    {name:'Romanian Deadlift',muscle_group:'hamstrings',sets:3,reps:10,weight:80},
    {name:'Leg Press',muscle_group:'quads',sets:3,reps:12,weight:140},
    {name:'Leg Curl',muscle_group:'hamstrings',sets:3,reps:12,weight:40},
    {name:'Calf Raise',muscle_group:'calves',sets:4,reps:15,weight:60},
  ]],
  ['Upper Body', 'strength', [
    {name:'Bench Press',muscle_group:'chest',sets:4,reps:8,weight:80},
    {name:'Barbell Row',muscle_group:'back',sets:4,reps:8,weight:70},
    {name:'Overhead Press',muscle_group:'shoulders',sets:3,reps:10,weight:50},
    {name:'Pull-ups',muscle_group:'back',sets:3,reps:8,weight:0},
    {name:'Dips',muscle_group:'triceps',sets:3,reps:12,weight:0},
    {name:'Barbell Curl',muscle_group:'biceps',sets:3,reps:12,weight:35},
  ]],
  ['Lower Body', 'strength', [
    {name:'Back Squat',muscle_group:'quads',sets:4,reps:6,weight:100},
    {name:'Deadlift',muscle_group:'back/hamstrings',sets:3,reps:5,weight:120},
    {name:'Walking Lunges',muscle_group:'quads',sets:3,reps:12,weight:20},
    {name:'Leg Curl',muscle_group:'hamstrings',sets:3,reps:12,weight:40},
    {name:'Calf Raise',muscle_group:'calves',sets:4,reps:20,weight:0},
  ]],
  ['Full Body A', 'strength', [
    {name:'Back Squat',muscle_group:'quads',sets:3,reps:8,weight:90},
    {name:'Bench Press',muscle_group:'chest',sets:3,reps:8,weight:75},
    {name:'Barbell Row',muscle_group:'back',sets:3,reps:8,weight:65},
    {name:'Overhead Press',muscle_group:'shoulders',sets:3,reps:10,weight:45},
  ]],
  ['Full Body B', 'strength', [
    {name:'Deadlift',muscle_group:'back/hamstrings',sets:3,reps:5,weight:120},
    {name:'Incline Bench Press',muscle_group:'chest',sets:3,reps:10,weight:60},
    {name:'Pull-ups',muscle_group:'back',sets:3,reps:8,weight:0},
    {name:'Bulgarian Split Squat',muscle_group:'quads',sets:3,reps:10,weight:20},
    {name:'Dips',muscle_group:'triceps',sets:3,reps:12,weight:0},
  ]],
  ['Back & Biceps', 'strength', [
    {name:'Deadlift',muscle_group:'back',sets:3,reps:5,weight:120},
    {name:'Pull-ups',muscle_group:'back',sets:4,reps:8,weight:0},
    {name:'One-Arm DB Row',muscle_group:'back',sets:3,reps:12,weight:30},
    {name:'Face Pull',muscle_group:'rear delts',sets:3,reps:15,weight:20},
    {name:'Barbell Curl',muscle_group:'biceps',sets:3,reps:12,weight:35},
    {name:'Hammer Curl',muscle_group:'biceps',sets:3,reps:12,weight:15},
  ]],
  ['Chest & Triceps', 'strength', [
    {name:'Bench Press',muscle_group:'chest',sets:4,reps:8,weight:80},
    {name:'Incline DB Press',muscle_group:'chest',sets:3,reps:12,weight:28},
    {name:'Cable Chest Fly',muscle_group:'chest',sets:3,reps:15,weight:15},
    {name:'Close-Grip Bench',muscle_group:'triceps',sets:3,reps:10,weight:60},
    {name:'Tricep Pushdown',muscle_group:'triceps',sets:3,reps:15,weight:25},
    {name:'Skull Crusher',muscle_group:'triceps',sets:3,reps:12,weight:30},
  ]],
  ['Arm Day', 'strength', [
    {name:'Barbell Curl',muscle_group:'biceps',sets:4,reps:10,weight:35},
    {name:'Hammer Curl',muscle_group:'biceps',sets:3,reps:12,weight:15},
    {name:'Concentration Curl',muscle_group:'biceps',sets:3,reps:12,weight:12},
    {name:'Tricep Pushdown',muscle_group:'triceps',sets:4,reps:12,weight:25},
    {name:'Skull Crusher',muscle_group:'triceps',sets:3,reps:12,weight:30},
    {name:'Dips',muscle_group:'triceps',sets:3,reps:15,weight:0},
  ]],
  ['HIIT Circuit', 'cardio', [
    {name:'Burpees',muscle_group:'full body',sets:4,reps:15,weight:0},
    {name:'Jump Squats',muscle_group:'quads',sets:4,reps:20,weight:0},
    {name:'Mountain Climbers',muscle_group:'core',sets:4,reps:30,weight:0},
    {name:'Box Jumps',muscle_group:'quads/glutes',sets:3,reps:15,weight:0},
    {name:'Push-ups',muscle_group:'chest',sets:4,reps:20,weight:0},
    {name:'High Knees',muscle_group:'cardio',sets:4,reps:40,weight:0},
  ]],
  ['Cardio Run', 'cardio', [
    {name:'Warm-up Jog',muscle_group:'cardio',sets:1,reps:1,weight:0},
    {name:'Steady State Run',muscle_group:'cardio',sets:1,reps:1,weight:0},
    {name:'Sprint Intervals',muscle_group:'cardio',sets:6,reps:1,weight:0},
    {name:'Cool-down Walk',muscle_group:'cardio',sets:1,reps:1,weight:0},
  ]],
  ['Mobility & Stretch', 'flexibility', [
    {name:'Hip Flexor Stretch',muscle_group:'hips',sets:2,reps:60,weight:0},
    {name:'Hamstring Stretch',muscle_group:'hamstrings',sets:2,reps:60,weight:0},
    {name:'Thoracic Rotation',muscle_group:'upper back',sets:3,reps:10,weight:0},
    {name:'Cat-Cow',muscle_group:'spine',sets:3,reps:10,weight:0},
    {name:'Pigeon Pose',muscle_group:'hips/glutes',sets:2,reps:90,weight:0},
    {name:'Shoulder Pass-Through',muscle_group:'shoulders',sets:3,reps:10,weight:0},
  ]],
];

// Indian nutrition templates: [name, calories, protein, carbs, fat]
const INDIAN_NUTRITION_TEMPLATES = [
  // Breads & Rice
  ['Roti (1 piece)', 95, 3, 17, 2],
  ['Butter Naan (1 piece)', 245, 7, 42, 6],
  ['Plain Paratha (1 piece)', 200, 4, 28, 8],
  ['Aloo Paratha (1 piece)', 290, 7, 42, 11],
  ['Steamed Rice (1 cup)', 205, 4, 45, 0.5],
  ['Jeera Rice (1 cup)', 230, 4, 46, 3],
  // Dal & Legumes
  ['Dal Tadka (1 bowl)', 180, 12, 26, 4],
  ['Dal Makhani (1 bowl)', 250, 11, 28, 10],
  ['Rajma (1 bowl)', 210, 13, 34, 3],
  ['Chana Masala (1 bowl)', 270, 14, 40, 6],
  ['Chole (1 bowl)', 260, 13, 38, 6],
  // Paneer & Veg
  ['Paneer Butter Masala (1 bowl)', 350, 16, 18, 24],
  ['Palak Paneer (1 bowl)', 280, 14, 15, 18],
  ['Kadai Paneer (1 bowl)', 310, 16, 16, 22],
  ['Matar Paneer (1 bowl)', 260, 14, 18, 16],
  ['Aloo Gobi (1 bowl)', 160, 4, 22, 7],
  ['Baingan Bharta (1 bowl)', 130, 4, 16, 6],
  ['Aloo Sabzi (1 bowl)', 170, 3, 28, 6],
  // Chicken & Meat
  ['Butter Chicken (1 bowl)', 380, 30, 18, 22],
  ['Chicken Curry (1 bowl)', 340, 28, 12, 20],
  ['Tandoori Chicken (2 pieces)', 250, 35, 5, 10],
  ['Chicken Biryani (1 plate)', 550, 30, 60, 18],
  ['Mutton Curry (1 bowl)', 380, 30, 8, 25],
  ['Egg Curry (2 eggs)', 220, 16, 8, 15],
  ['Fish Curry (1 bowl)', 280, 25, 10, 16],
  ['Veg Biryani (1 plate)', 420, 10, 70, 12],
  // South Indian
  ['Idli (2 pieces)', 130, 4, 26, 0.5],
  ['Plain Dosa (1 piece)', 160, 4, 30, 3],
  ['Masala Dosa (1 piece)', 290, 7, 44, 10],
  ['Sambar (1 bowl)', 90, 5, 14, 2],
  ['Upma (1 bowl)', 215, 5, 35, 6],
  ['Pongal (1 bowl)', 300, 9, 50, 7],
  // Snacks & Street Food
  ['Poha (1 bowl)', 260, 5, 47, 5],
  ['Khichdi (1 bowl)', 295, 12, 52, 5],
  ['Samosa (1 piece)', 155, 3, 19, 8],
  ['Vada Pav (1 piece)', 285, 8, 42, 10],
  ['Pav Bhaji (1 plate)', 390, 9, 62, 12],
  ['Dhokla (2 pieces)', 100, 4, 18, 2],
  ['Medu Vada (1 piece)', 130, 4, 18, 6],
  ['Curd Rice (1 bowl)', 255, 8, 43, 5],
  ['Lemon Rice (1 bowl)', 240, 4, 46, 4],
  // Dairy & Drinks
  ['Dahi / Curd (1 bowl)', 90, 5, 9, 4],
  ['Raita (1 bowl)', 70, 3, 8, 2],
  ['Lassi Sweet (1 glass)', 180, 6, 26, 5],
  ['Masala Chai (1 cup)', 80, 2, 12, 2],
  ['Chaas / Buttermilk (1 glass)', 40, 3, 5, 1],
];

function ensureTemplates(db: DatabaseSync) {
  const checkFitness = db.prepare('SELECT id FROM workout_templates WHERE name = ?');
  const insertFitness = db.prepare('INSERT INTO workout_templates (name, type, exercises) VALUES (?, ?, ?)');
  for (const [name, type, exercises] of FITNESS_TEMPLATES) {
    if (!checkFitness.get(name as string)) {
      insertFitness.run(name as string, type as string, JSON.stringify(exercises));
    }
  }

  const checkNutr = db.prepare('SELECT id FROM meal_templates WHERE name = ?');
  const insertNutr = db.prepare('INSERT INTO meal_templates (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)');
  for (const [n, c, p, carb, f] of INDIAN_NUTRITION_TEMPLATES) {
    if (!checkNutr.get(n as string)) {
      insertNutr.run(n, c, p, carb, f);
    }
  }
}

function seedIfEmpty(db: DatabaseSync) {
  const hasSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (hasSettings.count > 0) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

  for (const [k, v] of [['calorie_target','2000'],['protein_target','150'],['carbs_target','250'],['fat_target','65'],['sleep_target','8'],['workout_days_target','4'],['theme','dark']]) {
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(k, v);
  }

  const projectId = r(db.prepare(`INSERT INTO projects (name, description, color) VALUES ('Personal Growth', 'My personal development project', '#8B5CF6')`).run().lastInsertRowid);
  db.prepare(`INSERT INTO tasks (project_id, title, priority, status, due_date, estimated_minutes) VALUES (?, 'Review morning routine', 'P1', 'todo', ?, 30)`).run(projectId, today);
  db.prepare(`INSERT INTO tasks (project_id, title, priority, status, due_date, estimated_minutes) VALUES (?, 'Read 30 minutes', 'P2', 'in-progress', ?, 30)`).run(projectId, today);
  db.prepare(`INSERT INTO tasks (project_id, title, priority, status, due_date, estimated_minutes) VALUES (?, 'Weekly planning session', 'P1', 'todo', ?, 60)`).run(projectId, today);
  db.prepare(`INSERT INTO tasks (project_id, title, priority, status, estimated_minutes) VALUES (?, 'Set up workout schedule', 'P2', 'done', 20)`).run(projectId);

  const h1 = r(db.prepare(`INSERT INTO habits (name, frequency, color, icon) VALUES ('Morning Meditation', 'daily', '#10B981', '🧘')`).run().lastInsertRowid);
  const h2 = r(db.prepare(`INSERT INTO habits (name, frequency, color, icon) VALUES ('Read 30 min', 'daily', '#3B82F6', '📚')`).run().lastInsertRowid);
  const h3 = r(db.prepare(`INSERT INTO habits (name, frequency, color, icon) VALUES ('Exercise', 'daily', '#EF4444', '💪')`).run().lastInsertRowid);
  const h4 = r(db.prepare(`INSERT INTO habits (name, frequency, color, icon) VALUES ('Journal', 'daily', '#EC4899', '📝')`).run().lastInsertRowid);
  const h5 = r(db.prepare(`INSERT INTO habits (name, frequency, color, icon) VALUES ('Cold Shower', 'daily', '#06B6D4', '🚿')`).run().lastInsertRowid);

  const insertLog = db.prepare('INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)');
  for (let i = 0; i < 90; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    for (const hid of [h1, h2, h3, h4, h5]) {
      if (Math.random() > 0.25) insertLog.run(hid, date);
    }
  }
  insertLog.run(h1, today); insertLog.run(h2, today); insertLog.run(h4, today);

  for (const [d,t,n,c,p,carb,f] of [
    [today,'breakfast','Poha (1 bowl)',260,5,47,5],
    [today,'lunch','Dal Tadka (1 bowl)',180,12,26,4],
    [today,'lunch','Roti (1 piece)',95,3,17,2],
    [today,'snack','Masala Chai (1 cup)',80,2,12,2],
    [yesterday,'breakfast','Idli (2 pieces)',130,4,26,0.5],
    [yesterday,'lunch','Chicken Biryani (1 plate)',550,30,60,18],
    [yesterday,'dinner','Dal Makhani (1 bowl)',250,11,28,10],
  ]) db.prepare('INSERT INTO meal_logs (date,meal_type,name,calories,protein,carbs,fat) VALUES (?,?,?,?,?,?,?)').run(d,t,n,c,p,carb,f);

  const wid = r(db.prepare(`INSERT INTO workouts (date,name,type,duration_minutes) VALUES (?,'Push Day A','strength',65)`).run(yesterday).lastInsertRowid);
  const pushExs = [{name:'Bench Press',muscle_group:'chest',sets:4,reps:8,weight:80},{name:'Overhead Press',muscle_group:'shoulders',sets:3,reps:10,weight:50},{name:'Incline DB Press',muscle_group:'chest',sets:3,reps:12,weight:30},{name:'Tricep Dips',muscle_group:'triceps',sets:3,reps:12,weight:0},{name:'Lateral Raises',muscle_group:'shoulders',sets:3,reps:15,weight:12}];
  pushExs.forEach((ex,i) => db.prepare('INSERT INTO workout_exercises (workout_id,exercise_name,muscle_group,sets,reps,weight,order_index) VALUES (?,?,?,?,?,?,?)').run(wid,ex.name,ex.muscle_group,ex.sets,ex.reps,ex.weight,i));
  for (const [n,v,u] of [['Bench Press',100,'kg'],['Squat',120,'kg'],['Deadlift',140,'kg'],['Overhead Press',65,'kg']]) {
    db.prepare('INSERT OR IGNORE INTO personal_records (exercise_name,value,unit,date) VALUES (?,?,?,?)').run(n,v,u,yesterday);
  }

  db.prepare(`INSERT INTO journal_entries (date,content,mood,what_went_well,what_to_change,gratitude) VALUES (?,?,?,?,?,?)`).run(today,"## Today's Thoughts\n\nStarted the day with intention. The morning meditation session was particularly grounding.\n\nFeeling focused and ready to tackle the week ahead.",4,'Completed morning routine without checking phone first.','Sleep schedule drifted — need to be in bed by 22:30.','Health, a quiet morning, and the ability to work on things I care about.');
  db.prepare(`INSERT INTO journal_entries (date,content,mood,what_went_well,what_to_change,gratitude) VALUES (?,?,?,?,?,?)`).run(yesterday,"## Reflection\n\nSolid productive day. The deep work block in the morning really set the tone.",4,'Deep work block — 3 hours uninterrupted.','Procrastinated on the weekly review.','Good food, progress on goals, a helpful conversation.');

  db.prepare(`INSERT INTO thinking_logs (title,type,source,summary,key_arguments,my_critique,rating,tags,category) VALUES (?,?,?,?,?,?,?,?,?)`).run('Thinking, Fast and Slow','book','Daniel Kahneman','Two systems: System 1 (fast, intuitive) and System 2 (slow, deliberate). Most errors come from System 1 overriding System 2.','Anchoring bias, availability heuristic, loss aversion, planning fallacy.','Compelling, but WEIRD sample concerns remain.',5,JSON.stringify(['psychology','decision-making','bias']),'psychology');
  db.prepare(`INSERT INTO idea_inbox (content) VALUES (?)`).run('What if I tracked energy levels throughout the day in addition to mood?');
  db.prepare(`INSERT INTO idea_inbox (content) VALUES (?)`).run('Build a habit of reading before any screen time in the morning');

  db.prepare(`INSERT INTO sleep_logs (date,bedtime,wake_time,quality,duration_hours,notes) VALUES (?,?,?,?,?,?)`).run(today,'23:00','07:00',4,8.0,'Woke once around 3am');
  db.prepare(`INSERT INTO sleep_logs (date,bedtime,wake_time,quality,duration_hours,notes) VALUES (?,?,?,?,?,?)`).run(yesterday,'22:30','06:45',5,8.25,'Best sleep in a while');
  db.prepare(`INSERT INTO sleep_logs (date,bedtime,wake_time,quality,duration_hours,notes) VALUES (?,?,?,?,?,?)`).run(twoDaysAgo,'00:15','07:30',3,7.25,'Stayed up too late reading');

  db.prepare(`INSERT INTO conversation_logs (date,context,what_went_well,what_to_improve,key_insight,growth_areas) VALUES (?,?,?,?,?,?)`).run(yesterday,'Team meeting — presented to 8 people','Clear structure, good eye contact','Spoke too fast when nervous, filler words','Pausing before answering makes you seem thoughtful',JSON.stringify(['conciseness','public speaking','active listening']));
}
