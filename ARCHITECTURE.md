# 🏗️ NeuroGen Suite - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                     │
│  (Next.js 15 App Router + Tailwind CSS + React 19)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Home    │  │ Profile  │  │  Games   │  │  Report  │   │
│  │  Page    │  │ Creation │  │  Hub     │  │  View    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    GAME COMPONENTS LAYER                     │
│           (HTML5 Canvas + Web APIs + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🎮 MazeGame      → Dysgraphia    (Canvas + Mouse Track)   │
│  🔊 PhonicFinder  → Dyslexia      (Web Speech API)         │
│  🍕 PizzaParty    → Dyscalculia   (Timer + Click Events)   │
│  🎵 SyncMaster    → Dyspraxia     (Rhythm Detection)       │
│  ⭐ StarMapper    → NVLD          (Memory + Spatial)       │
│  🔗 DotConnect    → Visual-Spatial (Pattern Matching)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA COLLECTION LAYER                       │
│        (Zustand Store + LocalStorage Persistence)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Session Tracking                                        │
│     • 60 FPS coordinate capture                             │
│     • Event logging (clicks, timing)                        │
│     • Metrics aggregation                                   │
│                                                              │
│  💾 State Management (Zustand)                              │
│     • Child profile                                         │
│     • Game sessions                                         │
│     • Biometric data                                        │
│     • Completed games tracking                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BIOMETRIC ANALYTICS LAYER                   │
│              (/lib/biometrics + Custom Algorithms)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📐 mse-calculator.ts                                       │
│     → Mean Squared Error from ideal path                    │
│     → Wall collision detection                              │
│     → Proximity variance analysis                           │
│                                                              │
│  🤲 jerk-analysis.ts                                        │
│     → Third derivative of position (tremor)                 │
│     → Movement smoothness                                   │
│     → Motor control patterns                                │
│                                                              │
│  👁️ gaze-entropy.ts                                         │
│     → Shannon entropy of eye movements                      │
│     → Fixation detection                                    │
│     → Saccade analysis                                      │
│                                                              │
│  ⏱️ timing-metrics.ts                                       │
│     → Response latency                                      │
│     → Reaction time variance                                │
│     → Temporal patterns                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI/RAG SYSTEM LAYER                     │
│       (/lib/gemini + Clinical Knowledge Base + LLM)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🧠 clinical-knowledge-base.json                            │
│     • Age-based thresholds (6-8, 9-11, 12-14)              │
│     • Diagnostic criteria (DSM-5 aligned)                   │
│     • Clinical interventions                                │
│     • Research references                                   │
│                                                              │
│  🤖 report-generator.ts                                     │
│     • RAG prompt engineering                                │
│     • Context injection                                     │
│     • Threshold comparisons                                 │
│     • Kerala analogies                                      │
│                                                              │
│  ☁️ AI Providers (Free Tier)                                │
│     • Groq API (llama-3.3-70b)   [2-3s response]           │
│     • Gemini API (gemini-1.5)    [5-8s response]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   VISUALIZATION LAYER                        │
│         (Chart.js + jsPDF + SheetJS + React Charts)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Chart.js Visualizations                                 │
│     • Radar Chart   → Skill profile comparison              │
│     • Bar Chart     → Detailed metrics                      │
│     • Doughnut      → Game completion                       │
│                                                              │
│  📄 Report Exports                                          │
│     • PDF (jsPDF)   → Printable clinical report             │
│     • Excel (XLSX)  → Data for professionals                │
│     • Email (HTML)  → Doctor referral format                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              OPTIONAL: PERSISTENCE LAYER                     │
│                (Supabase PostgreSQL + Auth)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💾 Supabase (Optional)                                     │
│     • Cloud backup of sessions                              │
│     • Multi-device sync                                     │
│     • Admin dashboard data                                  │
│     • Longitudinal tracking                                 │
│                                                              │
│  🔒 Privacy First                                           │
│     • Local storage by default                              │
│     • Opt-in cloud sync                                     │
│     • No PII unless consented                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
User Plays Game
       │
       ▼
[Canvas/Web API Captures Input]
       │
       ▼
[60 FPS Coordinate Stream]
       │
       ▼
[Zustand Store Saves to LocalStorage]
       │
       ▼
[Biometric Algorithms Process Data]
    • MSE = Σ(actual - ideal)² / n
    • Jerk = d³/dt³(position)
    • Entropy = -Σ(p(i) * log(p(i)))
       │
       ▼
[Aggregated Metrics Object]
  {
    mse: 42.5,
    jerk: 8.2,
    phonicDelay: 850,
    subitizing: 3,
    ...
  }
       │
       ▼
[RAG Prompt Construction]
  "Child age 7, MSE=42.5, threshold=45..."
       │
       ▼
[Groq/Gemini API Call]
       │
       ▼
[AI Response + Clinical Reasoning]
       │
       ▼
[React Report Component Renders]
    • Executive Summary
    • Findings with Evidence
    • Charts (Chart.js)
    • Action Plans
       │
       ▼
[User Downloads PDF/Excel]
```

---

## 🧩 Component Hierarchy

```
app/
├── layout.tsx (Root Layout)
├── page.tsx (Home - Game Selection)
├── profile/page.tsx (Child Profile Form)
├── report/page.tsx (AI Report Display)
└── games/
    ├── maze/page.tsx
    │   └── <MazeGame /> component
    ├── phonic-finder/page.tsx
    │   └── <PhonicFinder /> component
    ├── cricket-forge/page.tsx
    │   └── <PizzaParty /> component
    └── ... (other games)

components/games/
├── MazeGame.tsx (Main logic)
├── PhonicFinder.tsx
├── PizzaParty.tsx
├── SyncMaster.tsx
├── StarMapper.tsx
└── DotConnect.tsx

stores/
└── session-store.ts (Zustand + Persistence)

lib/
├── biometrics/ (Algorithm modules)
├── gemini/ (AI integration)
└── supabase/ (Optional cloud)
```

---

## 🛠️ Technology Stack Breakdown

### Frontend Framework
- **Next.js 15** (App Router, SSR, Static Generation)
- **React 19** (Latest with Suspense, Transitions)
- **TypeScript 5** (Strict mode, Type safety)

### Styling
- **Tailwind CSS 4** (Utility-first, JIT compiler)
- **Lexend Font** (Dyslexia-friendly typography)
- **Custom Gradients** (Glassmorphism effects)

### State Management
- **Zustand 5** (Lightweight, no boilerplate)
- **LocalStorage Persistence** (Automatic sync)

### Game Engine
- **HTML5 Canvas API** (Native, no dependencies)
- **requestAnimationFrame** (60 FPS tracking)
- **Web Speech API** (Browser-native audio)

### AI/ML
- **Groq Cloud** (Llama 3.3 70B, ultra-fast)
- **Google Gemini** (Gemini 1.5 Flash, free tier)
- **RAG Architecture** (Clinical knowledge retrieval)

### Data Visualization
- **Chart.js 4.5** (Radar, Bar, Doughnut charts)
- **react-chartjs-2** (React wrapper)

### Report Generation
- **jsPDF** (Client-side PDF creation)
- **SheetJS (xlsx)** (Excel export)
- **Nodemailer** (Email integration)

### Optional Cloud
- **Supabase** (PostgreSQL, Auth, Storage)
- **Vercel** (Hosting, Edge Functions, CDN)

---

## 📊 Algorithm Details

### Mean Squared Error (MSE)
```typescript
MSE = (1/n) * Σ(actual_position - ideal_position)²

Interpretation:
• 0-20:  Excellent (typical development)
• 21-40: Good (age-appropriate)
• 41-60: Concerning (monitor)
• >60:   Flag for assessment
```

### Jerk Analysis
```typescript
Jerk = d³/dt³(position)
     = (acceleration[i] - acceleration[i-1]) / Δt

Tremor Indicator = std_dev(jerk) / mean(jerk)

Interpretation:
• <5:    Smooth movement
• 5-10:  Typical variation
• >10:   Potential tremor/motor issue
```

### Gaze Entropy
```typescript
Entropy = -Σ p(grid_cell) * log₂(p(grid_cell))

Interpretation:
• Low entropy:  Focused, predictable gaze
• High entropy: Chaotic eye movements
```

### Subitizing Threshold
```typescript
Subitizing = max(n) where response_time < 2000ms

Typical Development:
• Age 5-6:  Can instantly recognize 1-3 items
• Age 7-8:  Can instantly recognize 1-4 items
• Age 9+:   Can instantly recognize 1-5 items
```

---

## 🔒 Privacy & Security

### Data Storage Strategy
```
Priority 1: LocalStorage (always)
    ↓
Priority 2: Supabase (opt-in)
    ↓
Priority 3: Export (user-controlled)
```

### PII Handling
- Child name stored locally only
- No biometric data sent to AI (only aggregated metrics)
- Reports can be anonymized before sharing
- GDPR-compliant data deletion

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────┐
│     Vercel Edge Network (CDN)       │
│  ┌────────────────────────────────┐ │
│  │   Next.js Static Generation    │ │
│  │   • Home page (SSG)            │ │
│  │   • Game pages (SSG)           │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   Serverless Functions         │ │
│  │   • /api/gemini (Edge)         │ │
│  │   • /api/send-report (Edge)    │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│     External APIs (Free Tier)       │
│  • Groq Cloud (14k req/day)        │
│  • Google Gemini (60 req/min)      │
│  • Supabase (500MB free)           │
└─────────────────────────────────────┘
```

### Deployment Steps
1. `vercel` - Auto-detects Next.js
2. Set env vars in Vercel dashboard
3. Auto-deploy on git push
4. Global CDN distribution (instant worldwide)

---

## 📈 Scalability Plan

### Current Capacity (Free Tier)
- **Groq:** 14,400 reports/day
- **Vercel:** 100GB bandwidth/month
- **Supabase:** 500MB storage, 2GB transfer

### Scale to 10,000 Users
- Add Vercel Pro ($20/mo) - Unlimited bandwidth
- Upgrade Supabase Pro ($25/mo) - 8GB storage
- Implement Redis caching for repeated queries
- **Total cost:** ~$50/month for 10k users

### Scale to 1,000,000 Users
- Migrate to Groq Enterprise (custom pricing)
- Use Vercel Enterprise with dedicated edge
- Add PostgreSQL read replicas
- Implement CDN for static assets
- **Estimated cost:** ~$2,000-5,000/month

---

**This architecture enables:**
- ✅ Instant global deployment
- ✅ Zero downtime updates
- ✅ Automatic scaling
- ✅ <100ms latency worldwide
- ✅ 99.9% uptime SLA

**Built for AI Samasya 2026** 🚀
