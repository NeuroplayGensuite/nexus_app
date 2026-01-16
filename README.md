# 🧠 NeuroGen Suite

**A Multimodal Generative Diagnostic Suite for Learning Disability Detection**

Built for **AI Samasya 2026** hackathon

---

## 🎯 Problem Statement

Early detection of Learning Disabilities (LDs) is hindered by high costs and "test anxiety." 15% of children remain undiagnosed until academic failure occurs.

## 💡 Solution

NeuroGen Suite uses **"Stealth Assessment"** - turning gameplay into clinical-grade biometric analysis. We don't just score performance; we analyze the **micro-movements (Process Biometrics)** of how children interact with games.

---

## 🎮 The Five Diagnostic Games

| Game | Detects | Mechanics |
|------|---------|-----------|
| 🎮 **The Maze** | Dysgraphia | Trace a path - measures MSE, jerk, wall interactions |
| 🔊 **Phonic Finder** | Dyslexia | Sound-to-image matching - phonological processing |
| 🏏 **Cricket Forge** | Dyscalculia | Quantity sorting - subitizing threshold |
| 🎵 **Sync Master** | Dyspraxia | Rhythm game - motor coordination lag |
| ⭐ **Star Mapper** | NVLD | Pattern memory - visual-spatial decay |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd neurogen-suite
npm install
```

### Environment Setup

Copy the example env file and add your Gemini API key:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
GEMINI_API_KEY=your_api_key_from_aistudio.google.com
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👥 Team Division (4 Members, 16 Hours)

### **Member 1: Game Engine Lead**
**Files:** `components/games/MazeGame.tsx`, `components/games/CricketForge.tsx`

| Hour | Task |
|------|------|
| 1-2 | Review MazeGame, add visual polish |
| 3-6 | Enhance CricketForge animations |
| 7-10 | Add sound effects, particle effects |
| 11-14 | Mobile touch optimization |
| 15-16 | Integration testing |

### **Member 2: Speech & Tracking Lead**
**Files:** `components/games/PhonicFinder.tsx`, `components/games/SyncMaster.tsx`

| Hour | Task |
|------|------|
| 1-2 | Test Web Speech API across browsers |
| 3-6 | Enhance PhonicFinder with more phonemes |
| 7-10 | Add WebGazer.js for eye tracking (optional) |
| 11-14 | Polish SyncMaster rhythm detection |
| 15-16 | Edge case handling |

### **Member 3: Data & Analytics Lead**
**Files:** `lib/biometrics/*`, `components/games/StarMapper.tsx`, `stores/session-store.ts`

| Hour | Task |
|------|------|
| 1-2 | Review biometric calculations |
| 3-6 | Add Supabase integration |
| 7-10 | Enhance StarMapper pattern generation |
| 11-14 | Add Chart.js visualizations to report |
| 15-16 | Data validation |

### **Member 4: AI & UI Lead**
**Files:** `lib/gemini/*`, `app/api/gemini/route.ts`, `app/page.tsx`, `app/report/page.tsx`

| Hour | Task |
|------|------|
| 1-2 | Set up Gemini API, test prompt |
| 3-6 | Enhance report generation prompt |
| 7-10 | Design landing page animations |
| 11-14 | Add PDF export, Malayalam/Hindi support |
| 15-16 | Deploy to Vercel |

---

## 📁 Project Structure

```
neurogen-suite/
├── app/                      # Next.js 15 App Router
│   ├── page.tsx              # Landing page with game selection
│   ├── layout.tsx            # Root layout with Lexend font
│   ├── globals.css           # Global styles
│   ├── report/page.tsx       # AI-generated diagnostic report
│   ├── games/
│   │   ├── maze/             # Dysgraphia game
│   │   ├── phonic-finder/    # Dyslexia game
│   │   ├── cricket-forge/    # Dyscalculia game
│   │   ├── sync-master/      # Dyspraxia game
│   │   └── star-mapper/      # NVLD game
│   └── api/
│       ├── gemini/route.ts   # Gemini AI report generation
│       └── session/route.ts  # Session data management
├── components/
│   └── games/
│       ├── MazeGame.tsx      # Canvas-based maze tracing
│       ├── PhonicFinder.tsx  # Web Speech API game
│       ├── CricketForge.tsx  # Quantity recognition
│       ├── SyncMaster.tsx    # Rhythm catching game
│       └── StarMapper.tsx    # Pattern memory game
├── lib/
│   ├── biometrics/
│   │   ├── mse-calculator.ts # Mean Squared Error
│   │   ├── jerk-analysis.ts  # Tremor detection
│   │   ├── gaze-entropy.ts   # Eye tracking metrics
│   │   └── timing-metrics.ts # Response time analysis
│   ├── gemini/
│   │   └── report-generator.ts # AI prompt engineering
│   └── supabase/
│       └── client.ts         # Database client
├── stores/
│   └── session-store.ts      # Zustand state management
├── types/
│   └── index.ts              # TypeScript definitions
└── public/                   # Static assets
```

---

## 🧪 Key Biometric Algorithms

### 1. Mean Squared Error (MSE)
```typescript
MSE = (1/N) * Σ[(x_actual - x_ideal)² + (y_actual - y_ideal)²]
```
Measures path deviation for dysgraphia detection.

### 2. Jerk Analysis
```typescript
Jerk = d³position/dt³
```
Third derivative of position detects sub-visual tremors.

### 3. Wall-Hugging Ratio
```
Ratio = Collisions / ProximityEvents
```
- High ratio → Motor Dysgraphia (muscle control)
- Low ratio → Spatial Dysgraphia (perception)

### 4. Subitizing Threshold
Tests instant recognition of quantities 1-5 without counting.

### 5. Gaze Entropy
Shannon entropy of eye movement distribution - high entropy indicates chaotic tracking.

---

## 🤖 Gemini AI Integration

The report generation uses Gemini 1.5 Flash with a specialized prompt:

```
You are a Pediatric Neuro-Developmental Specialist...
Based on session metrics: [MSE, Gaze Entropy, Phonic Delay, Subitizing...]
Generate an empathetic diagnostic report with:
1. Executive Summary
2. Detailed Findings
3. Metrics Explained Simply
4. 4-Week Action Plan
5. Professional Referrals
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL` (optional)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional)
4. Deploy!

---

## 📊 Supabase Schema (Optional)

```sql
-- Children table
create table children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer not null,
  language text default 'en',
  created_at timestamp with time zone default now()
);

-- Sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id),
  game_type text not null,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  coordinates jsonb,
  events jsonb,
  metrics jsonb,
  created_at timestamp with time zone default now()
);

-- Reports table
create table reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id),
  session_ids uuid[],
  report_data jsonb,
  created_at timestamp with time zone default now()
);
```

---

## 🏆 Hackathon Tips

1. **Demo Flow**: Child profile → 5 games → AI Report
2. **Highlight**: Real-time biometric collection during gameplay
3. **Emphasize**: "Stealth Assessment" - no test anxiety
4. **Show**: The Gemini-generated report with action plans
5. **Mention**: Multi-language support (English/Malayalam/Hindi)

---

## 📝 License

MIT License - Built for AI Samasya 2026

---

## 🙏 Credits

- **Lexend Font** - Designed for readability
- **Gemini AI** - Report generation
- **Next.js 15** - Framework
- **Tailwind CSS** - Styling
- **Zustand** - State management

Good luck at the hackathon! 🚀
