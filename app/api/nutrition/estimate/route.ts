import { NextRequest, NextResponse } from 'next/server';

// ── Extended food knowledge base ────────────────────────────────────────────
// [calories, protein, carbs, fat] per typical serving
const FOOD_DB: Record<string, [number, number, number, number]> = {
  // Indian breads
  'roti': [95, 3, 17, 2], 'chapati': [95, 3, 17, 2], 'phulka': [70, 2, 14, 1],
  'paratha': [200, 4, 28, 8], 'aloo paratha': [290, 7, 42, 11], 'gobi paratha': [265, 6, 38, 10],
  'methi paratha': [220, 5, 30, 9], 'paneer paratha': [310, 12, 35, 13],
  'naan': [200, 6, 37, 3], 'butter naan': [245, 7, 42, 6], 'garlic naan': [255, 7, 43, 7],
  'kulcha': [210, 6, 38, 4], 'bhatura': [310, 7, 45, 12], 'puri': [110, 2, 14, 6],
  'missi roti': [120, 5, 18, 3], 'makki roti': [130, 3, 24, 3], 'bhakri': [105, 3, 20, 2],
  'thepla': [145, 4, 22, 5], 'thalipeeth': [195, 6, 28, 7],
  // Rice
  'rice': [205, 4, 45, 0.5], 'steamed rice': [205, 4, 45, 0.5], 'white rice': [205, 4, 45, 0.5],
  'brown rice': [215, 5, 45, 2], 'jeera rice': [230, 4, 46, 3], 'pulao': [250, 5, 48, 4],
  'biryani': [550, 30, 60, 18], 'veg biryani': [420, 10, 70, 12], 'chicken biryani': [550, 30, 60, 18],
  'mutton biryani': [620, 35, 62, 22], 'egg biryani': [500, 22, 68, 16],
  'lemon rice': [240, 4, 46, 4], 'curd rice': [255, 8, 43, 5], 'khichdi': [295, 12, 52, 5],
  // Dal & Legumes
  'dal': [180, 12, 26, 4], 'dal tadka': [180, 12, 26, 4], 'dal fry': [190, 12, 28, 5],
  'dal makhani': [250, 11, 28, 10], 'moong dal': [150, 11, 22, 2], 'masoor dal': [160, 12, 24, 2],
  'chana dal': [195, 13, 29, 3], 'toor dal': [170, 11, 27, 3], 'arhar dal': [170, 11, 27, 3],
  'rajma': [210, 13, 34, 3], 'chana masala': [270, 14, 40, 6], 'chole': [260, 13, 38, 6],
  'pav bhaji': [390, 9, 62, 12], 'chole bhature': [570, 20, 83, 18],
  // Paneer
  'paneer butter masala': [350, 16, 18, 24], 'palak paneer': [280, 14, 15, 18],
  'kadai paneer': [310, 16, 16, 22], 'matar paneer': [260, 14, 18, 16],
  'shahi paneer': [370, 15, 17, 27], 'paneer tikka': [290, 20, 12, 18],
  'paneer bhurji': [270, 16, 10, 18], 'paneer': [265, 18, 4, 20],
  // Vegetables
  'aloo gobi': [160, 4, 22, 7], 'aloo matar': [180, 5, 28, 6], 'aloo sabzi': [170, 3, 28, 6],
  'baingan bharta': [130, 4, 16, 6], 'bhindi masala': [140, 3, 18, 7], 'bhindi fry': [150, 3, 18, 8],
  'mix veg': [140, 4, 20, 5], 'dum aloo': [230, 5, 32, 10], 'palak sabzi': [100, 5, 10, 5],
  'sarson saag': [165, 7, 18, 8], 'saag': [130, 6, 14, 6],
  // Chicken
  'butter chicken': [380, 30, 18, 22], 'murgh makhani': [380, 30, 18, 22],
  'chicken curry': [340, 28, 12, 20], 'chicken masala': [320, 30, 10, 18],
  'tandoori chicken': [250, 35, 5, 10], 'chicken tikka': [220, 30, 6, 9],
  'chicken tikka masala': [360, 32, 14, 20], 'chicken 65': [310, 28, 12, 17],
  'kadai chicken': [350, 32, 12, 20], 'chicken keema': [330, 30, 8, 20],
  'keema matar': [350, 28, 14, 20], 'chicken vindaloo': [360, 30, 14, 22],
  'grilled chicken': [230, 43, 0, 5], 'boiled chicken': [210, 40, 0, 5],
  // Eggs
  'egg curry': [220, 16, 8, 15], 'egg bhurji': [190, 14, 6, 13],
  'boiled egg': [155, 13, 1, 11], 'omelette': [185, 14, 2, 14],
  'masala omelette': [200, 14, 4, 14], 'scrambled eggs': [185, 14, 2, 14],
  'fried egg': [185, 13, 1, 14], 'poached egg': [145, 12, 1, 10],
  // Mutton & Seafood
  'mutton curry': [380, 30, 8, 25], 'rogan josh': [400, 32, 10, 26],
  'mutton keema': [390, 32, 8, 26], 'laal maas': [420, 32, 8, 28],
  'fish curry': [280, 25, 10, 16], 'fish fry': [180, 22, 6, 8],
  'prawn curry': [255, 24, 10, 14], 'prawn masala': [240, 26, 8, 12],
  // South Indian
  'idli': [130, 4, 26, 0.5], 'dosa': [160, 4, 30, 3], 'masala dosa': [290, 7, 44, 10],
  'rava dosa': [210, 5, 38, 5], 'uttapam': [185, 5, 34, 4], 'uthappam': [185, 5, 34, 4],
  'sambar': [90, 5, 14, 2], 'upma': [215, 5, 35, 6], 'pongal': [300, 9, 50, 7],
  'medu vada': [130, 4, 18, 6], 'rasam': [45, 2, 8, 0.5], 'coconut chutney': [60, 1, 3, 5],
  'appam': [195, 4, 38, 3], 'pesarattu': [150, 7, 26, 2],
  // Snacks & Street food
  'poha': [260, 5, 47, 5], 'samosa': [155, 3, 19, 8], 'vada pav': [285, 8, 42, 10],
  'bhel puri': [200, 5, 38, 4], 'pani puri': [180, 4, 30, 5], 'golgappa': [180, 4, 30, 5],
  'sev puri': [245, 5, 40, 7], 'dahi vada': [220, 9, 30, 7], 'dahi puri': [265, 7, 42, 7],
  'aloo tikki': [230, 4, 34, 9], 'kachori': [200, 4, 24, 10], 'dhokla': [100, 4, 18, 2],
  'pakora': [200, 5, 24, 10], 'bhajiya': [200, 5, 24, 10], 'pakoda': [200, 5, 24, 10],
  'spring roll': [260, 6, 34, 11], 'momos': [200, 7, 36, 4], 'momos chicken': [240, 16, 34, 6],
  'bread pakora': [240, 6, 32, 10],
  // Dairy
  'dahi': [90, 5, 9, 4], 'curd': [90, 5, 9, 4], 'yoghurt': [100, 6, 11, 4],
  'greek yoghurt': [130, 17, 6, 4], 'raita': [70, 3, 8, 2], 'lassi': [180, 6, 26, 5],
  'chaas': [40, 3, 5, 1], 'buttermilk': [40, 3, 5, 1],
  'chai': [80, 2, 12, 2], 'masala chai': [80, 2, 12, 2], 'tea': [40, 1, 8, 1],
  'coffee': [5, 0, 1, 0], 'milk': [150, 8, 12, 8],
  // Sweets
  'gulab jamun': [280, 4, 46, 9], 'rasgulla': [200, 5, 38, 3], 'rasmalai': [250, 7, 38, 8],
  'halwa': [340, 5, 52, 13], 'kheer': [220, 6, 35, 7], 'ladoo': [180, 3, 26, 8],
  'barfi': [170, 4, 24, 7], 'jalebi': [280, 2, 56, 6], 'kulfi': [195, 5, 28, 8],
  'ice cream': [130, 2, 18, 6], 'mishti doi': [180, 5, 32, 4],
  // International
  'pasta': [320, 10, 58, 7], 'spaghetti': [300, 10, 56, 5], 'pizza': [480, 18, 60, 18],
  'burger': [490, 25, 44, 24], 'sandwich': [350, 18, 42, 12], 'wrap': [340, 20, 40, 10],
  'salad': [150, 6, 12, 9], 'caesar salad': [210, 8, 14, 14], 'soup': [120, 6, 14, 5],
  'french fries': [365, 4, 48, 17], 'noodles': [380, 10, 60, 10], 'fried rice': [330, 8, 54, 9],
  'oats': [165, 6, 28, 3], 'oatmeal': [165, 6, 28, 3], 'muesli': [310, 10, 52, 7],
  'granola': [300, 7, 44, 12], 'cereal': [200, 5, 40, 3],
  // Protein foods
  'chicken breast': [165, 31, 0, 3.6], 'turkey': [190, 29, 0, 8],
  'salmon': [280, 34, 0, 16], 'tuna': [160, 36, 0, 1], 'sardine': [200, 25, 0, 11],
  'tofu': [145, 15, 4, 8], 'tempeh': [195, 20, 10, 11],
  'whey protein': [130, 25, 5, 2], 'protein shake': [200, 30, 10, 4],
  // Fruits & Nuts
  'banana': [105, 1, 27, 0.5], 'apple': [95, 0.5, 25, 0.3], 'orange': [62, 1, 15, 0.2],
  'mango': [100, 1, 25, 0.5], 'grapes': [104, 1, 27, 0.2], 'watermelon': [86, 2, 22, 0.5],
  'papaya': [78, 1, 19, 0.5], 'pineapple': [82, 1, 22, 0.5], 'pomegranate': [105, 1.5, 26, 1],
  'almonds': [145, 5, 5, 13], 'cashews': [155, 5, 9, 12], 'walnuts': [165, 4, 3, 16],
  'peanuts': [145, 7, 4, 12], 'peanut butter': [190, 8, 7, 16],
};

// Normalize dish name for lookup
function normalize(name: string): string {
  return name.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

// Fuzzy match: check if query words are present in a key
function fuzzyMatch(query: string, key: string): number {
  const qWords = normalize(query).split(' ');
  const kWords = normalize(key).split(' ');
  const matches = qWords.filter(w => w.length > 2 && kWords.some(k => k.includes(w) || w.includes(k)));
  return matches.length / qWords.length;
}

// Keyword-based heuristic estimation for completely unknown dishes
function estimateByKeywords(name: string): [number, number, number, number] {
  const n = name.toLowerCase();
  let cal = 250, prot = 10, carb = 30, fat = 10;

  // Base modifiers by cooking method
  if (/fried|deep.?fry|pakora|bonda|vada/.test(n)) { cal += 100; fat += 8; }
  if (/grilled|tandoori|baked|roasted/.test(n)) { cal -= 40; fat -= 4; }
  if (/steamed|boiled/.test(n)) { cal -= 60; fat -= 5; }
  if (/butter|cream|makhani|malai/.test(n)) { cal += 80; fat += 10; }
  if (/ghee/.test(n)) { cal += 60; fat += 7; }

  // Base modifiers by main ingredient
  if (/chicken|murgh/.test(n)) { prot += 18; fat += 5; cal += 80; }
  if (/mutton|lamb|gosht/.test(n)) { prot += 18; fat += 12; cal += 120; }
  if (/paneer/.test(n)) { prot += 10; fat += 10; cal += 100; }
  if (/egg|anda/.test(n)) { prot += 10; fat += 8; cal += 60; }
  if (/fish|prawn|seafood|crab/.test(n)) { prot += 16; fat += 6; cal += 70; }
  if (/tofu|soya|soy/.test(n)) { prot += 10; fat += 4; cal += 40; }
  if (/rice|biryani|pulao/.test(n)) { carb += 30; cal += 120; }
  if (/bread|roti|naan|paratha/.test(n)) { carb += 20; cal += 80; }
  if (/dal|lentil|legume|beans|chana|rajma/.test(n)) { prot += 8; carb += 10; cal += 60; }
  if (/potato|aloo/.test(n)) { carb += 15; cal += 60; }
  if (/spinach|palak|leafy|greens|sabzi|veg/.test(n)) { cal -= 40; carb -= 5; }
  if (/sweet|halwa|kheer|ladoo|mithai|dessert/.test(n)) { carb += 25; fat += 5; cal += 120; }

  // Portion hints
  if (/\b1\s*cup\b/.test(n)) { /* standard */ }
  if (/\b1\s*piece\b|\b1\s*pc\b/.test(n)) { cal = Math.round(cal * 0.5); prot = Math.round(prot * 0.5); carb = Math.round(carb * 0.5); fat = Math.round(fat * 0.5); }
  if (/\b1\s*plate\b|\bfull\b/.test(n)) { cal = Math.round(cal * 1.3); prot = Math.round(prot * 1.3); carb = Math.round(carb * 1.3); fat = Math.round(fat * 1.3); }

  return [Math.max(cal, 50), Math.max(prot, 1), Math.max(carb, 2), Math.max(fat, 1)];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('name') || '').trim();
  if (!query) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const norm = normalize(query);

  // 1. Exact match
  if (FOOD_DB[norm]) {
    const [calories, protein, carbs, fat] = FOOD_DB[norm];
    return NextResponse.json({ calories, protein, carbs, fat, confidence: 'high', source: 'database' });
  }

  // 2. Partial match — find best scoring entry
  let bestScore = 0;
  let bestKey = '';
  for (const key of Object.keys(FOOD_DB)) {
    const score = fuzzyMatch(norm, key);
    if (score > bestScore) { bestScore = score; bestKey = key; }
  }

  if (bestScore >= 0.5 && bestKey) {
    const [calories, protein, carbs, fat] = FOOD_DB[bestKey];
    return NextResponse.json({ calories, protein, carbs, fat, confidence: 'medium', source: 'database', matched: bestKey });
  }

  // 3. Keyword heuristic fallback
  const [calories, protein, carbs, fat] = estimateByKeywords(query);
  return NextResponse.json({ calories, protein, carbs, fat, confidence: 'low', source: 'estimated' });
}
