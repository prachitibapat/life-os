import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'lifeos.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initSchema(db);
  migrateSchema(db);
  seedIfEmpty(db);
  ensureTemplates(db);
  return db;
}

function migrateSchema(db: DatabaseSync) {
  // Add source_url to meal_templates (idempotent)
  try { db.exec(`ALTER TABLE meal_templates ADD COLUMN source_url TEXT DEFAULT ''`); } catch {}
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

// Nutrition templates: [name, calories, protein, carbs, fat]
const INDIAN_NUTRITION_TEMPLATES = [
  // ── Breads & Rice ──────────────────────────────────────────────
  ['Roti (1 piece)', 95, 3, 17, 2],
  ['Butter Roti (1 piece)', 120, 3, 17, 4],
  ['Phulka (1 piece)', 70, 2, 14, 1],
  ['Plain Paratha (1 piece)', 200, 4, 28, 8],
  ['Aloo Paratha (1 piece)', 290, 7, 42, 11],
  ['Gobi Paratha (1 piece)', 265, 6, 38, 10],
  ['Methi Paratha (1 piece)', 220, 5, 30, 9],
  ['Paneer Paratha (1 piece)', 310, 12, 35, 13],
  ['Plain Naan (1 piece)', 200, 6, 37, 3],
  ['Butter Naan (1 piece)', 245, 7, 42, 6],
  ['Garlic Naan (1 piece)', 255, 7, 43, 7],
  ['Kulcha (1 piece)', 210, 6, 38, 4],
  ['Bhatura (1 piece)', 310, 7, 45, 12],
  ['Puri (1 piece)', 110, 2, 14, 6],
  ['Missi Roti (1 piece)', 120, 5, 18, 3],
  ['Steamed Rice (1 cup)', 205, 4, 45, 0.5],
  ['Jeera Rice (1 cup)', 230, 4, 46, 3],
  ['Pulao (1 cup)', 250, 5, 48, 4],
  ['Lemon Rice (1 bowl)', 240, 4, 46, 4],
  ['Curd Rice (1 bowl)', 255, 8, 43, 5],
  ['Tamarind Rice (1 bowl)', 260, 4, 50, 5],
  ['Coconut Rice (1 bowl)', 270, 4, 50, 6],
  ['Tomato Rice (1 bowl)', 235, 4, 46, 4],
  ['Khichdi (1 bowl)', 295, 12, 52, 5],
  ['Moong Dal Khichdi (1 bowl)', 280, 13, 50, 4],

  // ── Dal & Legumes ───────────────────────────────────────────────
  ['Dal Tadka (1 bowl)', 180, 12, 26, 4],
  ['Dal Makhani (1 bowl)', 250, 11, 28, 10],
  ['Dal Fry (1 bowl)', 190, 12, 28, 5],
  ['Moong Dal (1 bowl)', 150, 11, 22, 2],
  ['Masoor Dal (1 bowl)', 160, 12, 24, 2],
  ['Chana Dal (1 bowl)', 195, 13, 29, 3],
  ['Toor Dal (1 bowl)', 170, 11, 27, 3],
  ['Rajma (1 bowl)', 210, 13, 34, 3],
  ['Chana Masala (1 bowl)', 270, 14, 40, 6],
  ['Chole (1 bowl)', 260, 13, 38, 6],
  ['Chole Bhature (1 plate)', 570, 20, 83, 18],
  ['Pav Bhaji (1 plate)', 390, 9, 62, 12],
  ['Matar (1 bowl)', 140, 8, 22, 3],
  ['Lobiya / Black-eyed Peas (1 bowl)', 200, 12, 32, 3],
  ['Kala Chana (1 bowl)', 230, 14, 36, 4],
  ['Moth Beans (1 bowl)', 220, 14, 34, 3],

  // ── Paneer & Veg ────────────────────────────────────────────────
  ['Paneer Butter Masala (1 bowl)', 350, 16, 18, 24],
  ['Palak Paneer (1 bowl)', 280, 14, 15, 18],
  ['Kadai Paneer (1 bowl)', 310, 16, 16, 22],
  ['Matar Paneer (1 bowl)', 260, 14, 18, 16],
  ['Shahi Paneer (1 bowl)', 370, 15, 17, 27],
  ['Paneer Tikka Masala (1 bowl)', 340, 18, 16, 23],
  ['Paneer Tikka (6 pieces)', 290, 20, 12, 18],
  ['Paneer Bhurji (1 bowl)', 270, 16, 10, 18],
  ['Aloo Gobi (1 bowl)', 160, 4, 22, 7],
  ['Aloo Matar (1 bowl)', 180, 5, 28, 6],
  ['Aloo Sabzi (1 bowl)', 170, 3, 28, 6],
  ['Baingan Bharta (1 bowl)', 130, 4, 16, 6],
  ['Baingan ka Salan (1 bowl)', 150, 4, 18, 7],
  ['Bhindi Masala (1 bowl)', 140, 3, 18, 7],
  ['Bhindi Fry (1 bowl)', 150, 3, 18, 8],
  ['Gobhi Masala (1 bowl)', 130, 4, 16, 6],
  ['Lauki / Bottle Gourd Sabzi (1 bowl)', 90, 3, 13, 3],
  ['Kaddu (Pumpkin) Sabzi (1 bowl)', 100, 2, 16, 4],
  ['Tinda Sabzi (1 bowl)', 95, 2, 14, 4],
  ['Karela (Bitter Gourd) Fry (1 bowl)', 110, 3, 12, 6],
  ['Methi Sabzi (1 bowl)', 115, 4, 12, 6],
  ['Palak Sabzi (1 bowl)', 100, 5, 10, 5],
  ['Mix Veg (1 bowl)', 140, 4, 20, 5],
  ['Navratan Korma (1 bowl)', 280, 8, 22, 18],
  ['Veg Kolhapuri (1 bowl)', 200, 6, 20, 11],
  ['Aloo Palak (1 bowl)', 175, 5, 24, 7],

  // ── Chicken & Eggs ──────────────────────────────────────────────
  ['Butter Chicken (1 bowl)', 380, 30, 18, 22],
  ['Chicken Curry (1 bowl)', 340, 28, 12, 20],
  ['Chicken Masala (1 bowl)', 320, 30, 10, 18],
  ['Chicken Tikka Masala (1 bowl)', 360, 32, 14, 20],
  ['Tandoori Chicken (2 pieces)', 250, 35, 5, 10],
  ['Chicken Tikka (6 pieces)', 220, 30, 6, 9],
  ['Chicken Biryani (1 plate)', 550, 30, 60, 18],
  ['Chicken 65 (1 bowl)', 310, 28, 12, 17],
  ['Chicken Lollipop (4 pieces)', 270, 24, 10, 15],
  ['Kadai Chicken (1 bowl)', 350, 32, 12, 20],
  ['Chicken Keema (1 bowl)', 330, 30, 8, 20],
  ['Keema Matar (1 bowl)', 350, 28, 14, 20],
  ['Chicken Vindaloo (1 bowl)', 360, 30, 14, 22],
  ['Grilled Chicken Breast (150g)', 230, 43, 0, 5],
  ['Boiled Chicken (150g)', 210, 40, 0, 5],
  ['Egg Curry (2 eggs)', 220, 16, 8, 15],
  ['Egg Bhurji (2 eggs)', 190, 14, 6, 13],
  ['Boiled Eggs (2)', 155, 13, 1, 11],
  ['Omelette (2 eggs)', 185, 14, 2, 14],
  ['Masala Omelette (2 eggs)', 200, 14, 4, 14],
  ['Anda Curry (2 eggs)', 210, 15, 8, 14],

  // ── Mutton & Seafood ────────────────────────────────────────────
  ['Mutton Curry (1 bowl)', 380, 30, 8, 25],
  ['Mutton Biryani (1 plate)', 620, 35, 62, 22],
  ['Mutton Rogan Josh (1 bowl)', 400, 32, 10, 26],
  ['Mutton Keema (1 bowl)', 390, 32, 8, 26],
  ['Lamb Chops (2 pieces)', 360, 28, 2, 26],
  ['Fish Curry (1 bowl)', 280, 25, 10, 16],
  ['Fish Fry (1 piece)', 180, 22, 6, 8],
  ['Grilled Fish (150g)', 185, 34, 0, 5],
  ['Prawn Masala (1 bowl)', 240, 26, 8, 12],
  ['Prawn Curry (1 bowl)', 255, 24, 10, 14],
  ['Fish Tikka (4 pieces)', 195, 28, 4, 8],
  ['Crab Curry (1 bowl)', 220, 24, 8, 10],

  // ── Biryani & Rice Dishes ───────────────────────────────────────
  ['Veg Biryani (1 plate)', 420, 10, 70, 12],
  ['Paneer Biryani (1 plate)', 510, 18, 70, 18],
  ['Egg Biryani (1 plate)', 500, 22, 68, 16],
  ['Hyderabadi Biryani (1 plate)', 590, 32, 62, 20],
  ['Dum Biryani (1 plate)', 580, 30, 64, 20],
  ['Tahri / Veg Pulao (1 plate)', 380, 8, 68, 8],
  ['Peas Pulao (1 cup)', 245, 7, 48, 3],

  // ── South Indian ────────────────────────────────────────────────
  ['Idli (2 pieces)', 130, 4, 26, 0.5],
  ['Idli (1 piece)', 65, 2, 13, 0.3],
  ['Plain Dosa (1 piece)', 160, 4, 30, 3],
  ['Masala Dosa (1 piece)', 290, 7, 44, 10],
  ['Rava Dosa (1 piece)', 210, 5, 38, 5],
  ['Onion Uthappam (1 piece)', 200, 5, 36, 4],
  ['Set Dosa (2 pieces)', 220, 6, 42, 4],
  ['Sambar (1 bowl)', 90, 5, 14, 2],
  ['Coconut Chutney (2 tbsp)', 60, 1, 3, 5],
  ['Upma (1 bowl)', 215, 5, 35, 6],
  ['Pongal (1 bowl)', 300, 9, 50, 7],
  ['Medu Vada (1 piece)', 130, 4, 18, 6],
  ['Rasam (1 bowl)', 45, 2, 8, 0.5],
  ['Aviyal (1 bowl)', 165, 4, 20, 8],
  ['Appam (2 pieces)', 195, 4, 38, 3],
  ['Puttu (1 serving)', 210, 5, 43, 2],
  ['Kadala Curry (1 bowl)', 230, 12, 34, 5],
  ['Pesarattu (1 piece)', 150, 7, 26, 2],
  ['Uttapam (1 piece)', 185, 5, 34, 4],

  // ── Snacks & Street Food ────────────────────────────────────────
  ['Poha (1 bowl)', 260, 5, 47, 5],
  ['Batata Poha (1 bowl)', 280, 5, 50, 6],
  ['Samosa (1 piece)', 155, 3, 19, 8],
  ['Vada Pav (1 piece)', 285, 8, 42, 10],
  ['Dabeli (1 piece)', 250, 7, 40, 8],
  ['Bhel Puri (1 plate)', 200, 5, 38, 4],
  ['Pani Puri / Golgappa (6 pieces)', 180, 4, 30, 5],
  ['Sev Puri (1 plate)', 245, 5, 40, 7],
  ['Dahi Puri (1 plate)', 265, 7, 42, 7],
  ['Dahi Vada (2 pieces)', 220, 9, 30, 7],
  ['Raj Kachori (1 piece)', 310, 9, 46, 10],
  ['Aloo Tikki (2 pieces)', 230, 4, 34, 9],
  ['Kachori (1 piece)', 200, 4, 24, 10],
  ['Dhokla (2 pieces)', 100, 4, 18, 2],
  ['Khandvi (6 pieces)', 175, 6, 22, 7],
  ['Handvo (1 slice)', 160, 6, 24, 5],
  ['Thepla (1 piece)', 145, 4, 22, 5],
  ['Fafda (50g)', 190, 5, 26, 8],
  ['Jalebi (2 pieces)', 280, 2, 56, 6],
  ['Pakora / Bhajiya (4 pieces)', 200, 5, 24, 10],
  ['Onion Pakora (4 pieces)', 185, 4, 22, 9],
  ['Paneer Pakora (4 pieces)', 270, 12, 22, 15],
  ['Spring Roll (2 pieces)', 260, 6, 34, 11],
  ['Aloo Bonda (2 pieces)', 210, 4, 30, 9],
  ['Mirchi Bajji (2 pieces)', 195, 4, 26, 9],
  ['Bread Pakora (1 piece)', 240, 6, 32, 10],
  ['Pav (1 piece)', 120, 4, 22, 2],
  ['Egg Puff (1 piece)', 260, 9, 28, 13],

  // ── Sweets & Desserts ───────────────────────────────────────────
  ['Gulab Jamun (2 pieces)', 280, 4, 46, 9],
  ['Rasgulla (2 pieces)', 200, 5, 38, 3],
  ['Rasmalai (2 pieces)', 250, 7, 38, 8],
  ['Halwa (1 bowl)', 340, 5, 52, 13],
  ['Gajar Halwa (1 bowl)', 320, 5, 50, 12],
  ['Kheer (1 bowl)', 220, 6, 35, 7],
  ['Rice Kheer (1 bowl)', 230, 6, 38, 7],
  ['Sewai / Vermicelli Kheer (1 bowl)', 240, 6, 40, 7],
  ['Ladoo (1 piece)', 180, 3, 26, 8],
  ['Besan Ladoo (1 piece)', 195, 4, 24, 10],
  ['Motichoor Ladoo (1 piece)', 200, 3, 30, 8],
  ['Barfi (1 piece)', 170, 4, 24, 7],
  ['Kaju Barfi (1 piece)', 220, 5, 26, 11],
  ['Peda (1 piece)', 160, 3, 24, 6],
  ['Mysore Pak (1 piece)', 235, 3, 28, 13],
  ['Basundi (1 bowl)', 260, 8, 38, 9],
  ['Shrikhand (1 bowl)', 280, 9, 42, 9],
  ['Rabri (1 bowl)', 310, 9, 46, 11],
  ['Kulfi (1 piece)', 195, 5, 28, 8],
  ['Ice Cream (1 scoop)', 130, 2, 18, 6],

  // ── Dairy & Drinks ──────────────────────────────────────────────
  ['Dahi / Curd (1 bowl)', 90, 5, 9, 4],
  ['Raita (1 bowl)', 70, 3, 8, 2],
  ['Boondi Raita (1 bowl)', 110, 4, 14, 4],
  ['Lassi Sweet (1 glass)', 180, 6, 26, 5],
  ['Lassi Salted (1 glass)', 120, 5, 14, 5],
  ['Masala Chai (1 cup)', 80, 2, 12, 2],
  ['Black Tea (1 cup)', 10, 0, 2, 0],
  ['Black Coffee (1 cup)', 5, 0, 1, 0],
  ['Coffee with Milk (1 cup)', 70, 3, 9, 3],
  ['Chaas / Buttermilk (1 glass)', 40, 3, 5, 1],
  ['Haldi Doodh (1 cup)', 135, 5, 15, 6],
  ['Mango Lassi (1 glass)', 220, 6, 38, 5],
  ['Cold Coffee (1 glass)', 185, 5, 28, 6],
  ['Lemonade / Nimbu Pani (1 glass)', 65, 0, 17, 0],
  ['Fresh Lime Soda (1 glass)', 55, 0, 14, 0],
  ['Aam Panna (1 glass)', 110, 0, 28, 0],
  ['Jaljeera (1 glass)', 60, 1, 14, 0],
  ['Thandai (1 glass)', 240, 6, 38, 8],
  ['Coconut Water (1 glass)', 50, 1, 12, 0],
  ['Milk Full Fat (1 cup)', 150, 8, 12, 8],
  ['Milk Skimmed (1 cup)', 90, 9, 12, 0.5],
  ['Paneer (100g)', 265, 18, 4, 20],
  ['Chhena (100g)', 190, 14, 6, 13],

  // ── Rajasthani & North Indian Regional ──────────────────────────
  ['Dal Baati Churma (1 serving)', 680, 18, 90, 26],
  ['Baati (1 piece)', 230, 5, 38, 7],
  ['Gatte ki Sabzi (1 bowl)', 260, 10, 28, 12],
  ['Ker Sangri (1 bowl)', 180, 6, 22, 8],
  ['Laal Maas (1 bowl)', 420, 32, 8, 28],
  ['Kadhi Pakora (1 bowl)', 200, 6, 26, 8],
  ['Punjabi Kadhi (1 bowl)', 190, 6, 24, 8],
  ['Sarson da Saag (1 bowl)', 165, 7, 18, 8],
  ['Makki di Roti (1 piece)', 130, 3, 24, 3],
  ['Butter Milk Kadhi (1 bowl)', 150, 5, 20, 6],
  ['Mooli Paratha (1 piece)', 220, 5, 30, 9],
  ['Dum Aloo (1 bowl)', 230, 5, 32, 10],

  // ── Bengali & East Indian ────────────────────────────────────────
  ['Machher Jhol / Fish Curry Bengali (1 bowl)', 260, 24, 8, 15],
  ['Kosha Mangsho / Bengali Mutton (1 bowl)', 410, 34, 8, 27],
  ['Cholar Dal (1 bowl)', 210, 12, 32, 4],
  ['Shorshe Ilish (1 bowl)', 380, 28, 6, 26],
  ['Posto (1 bowl)', 200, 5, 16, 14],
  ['Aloo Posto (1 bowl)', 210, 4, 24, 11],
  ['Begun Bhaja (2 slices)', 130, 2, 12, 9],
  ['Mishti Doi (1 bowl)', 180, 5, 32, 4],
  ['Sandesh (2 pieces)', 170, 5, 26, 5],

  // ── Maharashtra & Goan ───────────────────────────────────────────
  ['Misal Pav (1 plate)', 430, 14, 62, 14],
  ['Thalipeeth (1 piece)', 195, 6, 28, 7],
  ['Puran Poli (1 piece)', 290, 7, 50, 7],
  ['Modak (2 pieces)', 220, 4, 40, 6],
  ['Kombdi Vade (1 plate)', 520, 28, 54, 20],
  ['Chicken Xacuti (1 bowl)', 360, 30, 12, 22],
  ['Goan Fish Curry (1 bowl)', 290, 26, 10, 16],
  ['Solkadhi (1 glass)', 55, 1, 8, 2],
  ['Bhakri (1 piece)', 105, 3, 20, 2],

  // ── Common International ──────────────────────────────────────────
  ['Pasta (1 cup cooked)', 220, 8, 43, 1.5],
  ['Pasta with Tomato Sauce (1 bowl)', 320, 10, 58, 7],
  ['Spaghetti Bolognese (1 bowl)', 460, 22, 56, 16],
  ['Grilled Chicken Sandwich', 380, 30, 36, 12],
  ['Veggie Burger', 380, 12, 50, 16],
  ['Chicken Burger', 490, 30, 42, 22],
  ['Pizza Margherita (2 slices)', 480, 18, 60, 18],
  ['Pizza Pepperoni (2 slices)', 560, 22, 58, 26],
  ['French Fries (medium)', 365, 4, 48, 17],
  ['Caesar Salad (1 bowl)', 210, 8, 14, 14],
  ['Greek Salad (1 bowl)', 175, 5, 14, 12],
  ['Chicken Salad (1 bowl)', 260, 22, 12, 14],
  ['Fried Rice (1 cup)', 330, 8, 54, 9],
  ['Hakka Noodles (1 plate)', 380, 10, 60, 10],
  ['Chow Mein (1 plate)', 370, 12, 56, 10],
  ['Manchurian (1 bowl)', 295, 8, 40, 12],
  ['Chilli Chicken (1 bowl)', 330, 26, 16, 18],
  ['Paneer Chilli (1 bowl)', 340, 16, 18, 20],
  ['Momos Veg (6 pieces)', 200, 7, 36, 4],
  ['Momos Chicken (6 pieces)', 240, 16, 34, 6],
  ['Sushi Roll (6 pieces)', 280, 10, 52, 4],
  ['Oats (1 cup cooked)', 165, 6, 28, 3],
  ['Muesli (1 cup with milk)', 310, 10, 52, 7],
  ['Granola (1/2 cup)', 300, 7, 44, 12],
  ['Banana (1 medium)', 105, 1, 27, 0.5],
  ['Apple (1 medium)', 95, 0.5, 25, 0.3],
  ['Orange (1 medium)', 62, 1, 15, 0.2],
  ['Mango (1 cup)', 100, 1, 25, 0.5],
  ['Grapes (1 cup)', 104, 1, 27, 0.2],
  ['Almonds (25g)', 145, 5, 5, 13],
  ['Peanuts (25g)', 145, 7, 4, 12],
  ['Walnuts (25g)', 165, 4, 3, 16],
  ['Peanut Butter (2 tbsp)', 190, 8, 7, 16],
  ['Whey Protein Shake (1 scoop)', 130, 25, 5, 2],
  ['Protein Bar (1 bar)', 210, 20, 22, 7],
  ['Bread White (2 slices)', 150, 5, 28, 2],
  ['Bread Brown (2 slices)', 140, 6, 26, 2],
  ['Upma (1 bowl)', 215, 5, 35, 6],
  ['Pongal (1 bowl)', 300, 9, 50, 7],
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
