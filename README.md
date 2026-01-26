# 🧠 NeuroGen Suite

**Version 0.1.0** | 🚀 Active Development

[![Next.js](https://img.shields.io/badge/Next.js-16.1.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**A Multimodal Generative AI-Powered Learning Disability Detection Platform**

Built for **AI Samasya 2026** Hackathon

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Quick Start Guide](#-quick-start-guide)
- [Project Structure](#-project-structure)
- [Games & Diagnostics](#-games--diagnostics)
- [Configuration](#-configuration)
- [Development Guide](#-development-guide)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [License](#-license)

---

## 🎯 Project Overview

**NeuroGen Suite** is an innovative Learning Disability (LD) detection platform that transforms traditional clinical assessments into engaging, game-based diagnostics. Using **"Stealth Assessment"** methodology, we capture and analyze biometric data during gameplay to identify potential learning disabilities without triggering test anxiety.

### The Problem
- Early detection of Learning Disabilities is hindered by high costs ($3,000+ per assessment)
- Traditional testing creates anxiety in children, affecting accuracy
- 15% of children remain undiagnosed until academic failure occurs
- Limited access to specialized diagnostic services in rural areas

### Our Solution
NeuroGen Suite analyzes **micro-movements (Process Biometrics)** during gameplay:
- Real-time tracking of hand movements, eye gaze, and response patterns
- AI-powered analysis using Google Gemini and Groq APIs
- Instant, empathetic diagnostic reports with actionable recommendations
- Multi-language support (English, Malayalam, Hindi)

---

## ✨ Features

### 🎮 Five Diagnostic Games
1. **The Maze** - Dysgraphia detection through path tracing and motor control analysis
2. **Phonic Finder** - Dyslexia detection via sound-to-image phonological processing
3. **Cricket Forge** - Dyscalculia detection using quantity recognition and sorting
4. **Sync Master** - Dyspraxia detection through rhythm-based motor coordination
5. **Star Mapper** - NVLD detection via pattern memory and visual-spatial processing

### 🔬 Biometric Analysis
- **MSE Calculator** - Measures path deviation accuracy
- **Jerk Analysis** - Detects sub-visual tremors and movement smoothness
- **Wall-Hugging Ratio** - Distinguishes motor vs spatial dysgraphia
- **Subitizing Threshold** - Tests instant quantity recognition (1-5)
- **Gaze Entropy** - Analyzes eye movement patterns using Shannon entropy
- **Timing Metrics** - Response time and pattern analysis

### 🤖 AI-Powered Diagnostics
- **Dual AI Integration** - Google Gemini API & Groq API support
- **Hybrid Diagnostic Engine** - Combines rule-based and ML approaches
- **Clinical-Grade Reports** - Empathetic, actionable diagnostic summaries
- **Adaptive Level Generation** - AI creates personalized game difficulty

### 📊 Session Management
- Real-time biometric data capture and storage
- Session history and progress tracking
- Multi-child profile management
- Excel data export for further analysis

### 📄 Report Generation
- AI-generated diagnostic reports with:
  - Executive Summary
  - Detailed Findings
  - Metrics Explained Simply
  - 4-Week Action Plan
  - Professional Referrals
- PDF export functionality
- Email notification system

### 🗄️ Database Integration
- Supabase PostgreSQL backend
- Secure data storage with UUID-based records
- Real-time sync capabilities
- Optional cloud storage

### 🌐 Modern UI/UX
- Responsive design for desktop, tablet, and mobile
- Lexend font for enhanced readability
- Real-time animations using Pixi.js
- Dark/light mode support
- Offline detection and graceful degradation

---

## 🛠️ Technology Stack

### Frontend Framework
- **Next.js** `16.1.2` - React framework with App Router
- **React** `19.2.3` - UI library with latest concurrent features
- **TypeScript** `5` - Type-safe JavaScript

### Styling & UI
- **Tailwind CSS** `4` - Utility-first CSS framework with PostCSS
- **Lexend Font** - Designed for reading accessibility

### State Management & Data
- **Zustand** `5.0.10` - Lightweight state management
- **Chart.js** `4.5.1` + **react-chartjs-2** `5.3.1` - Data visualization
- **Pixi.js** `8.15.0` - High-performance 2D WebGL rendering

### Backend & APIs
- **Supabase** `2.90.1` - PostgreSQL database and authentication
- **Google Gemini API** - AI-powered report generation
- **Groq API** - Fast LLM inference (recommended)

### Utilities & Tools
- **Nodemailer** `7.0.12` - Email notifications
- **PDFKit** `0.17.2` - PDF report generation
- **UUID** `13.0.0` - Unique identifier generation
- **EmailJS** `4.4.1` - Client-side email service

### Development Tools
- **ESLint** `9` - Code linting with Next.js config
- **PostCSS** - CSS processing

---

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Git** ([Download](https://git-scm.com/))
- **API Keys** (free):
  - [Groq API Key](https://console.groq.com) (Recommended) OR
  - [Google Gemini API Key](https://aistudio.google.com)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/allenalex1246end/nexus_app.git
   cd nexus_app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env.local` file in the root directory:
   ```bash
   touch .env.local
   ```

   Add the following variables:
   ```env
   # AI API Keys (Choose one or both)
   GROQ_API_KEY=your_groq_api_key_here          # Recommended - Faster
   GEMINI_API_KEY=your_gemini_api_key_here      # Alternative

   # Supabase (Optional - for cloud storage)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Email (Optional - for notifications)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

   📖 **See [API_KEYS_GUIDE.md](API_KEYS_GUIDE.md) for detailed setup instructions**

4. **Run Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser

5. **Build for Production**
   ```bash
   npm run build
   npm run start
   ```

### First Run

1. Navigate to the landing page
2. Create a child profile (name, age, language)
3. Select a diagnostic game to begin
4. After completing 1-5 games, view the AI-generated report

---

## 📁 Project Structure

```
nexus_app/
├── app/                          # Next.js 16 App Router
│   ├── page.tsx                  # Landing page with game selection
│   ├── layout.tsx                # Root layout with global providers
│   ├── globals.css               # Global styles and Tailwind directives
│   ├── games/                    # Game route pages
│   │   ├── maze/                 # The Maze (Dysgraphia)
│   │   ├── phonic-finder/        # Phonic Finder (Dyslexia)
│   │   ├── cricket-forge/        # Cricket Forge (Dyscalculia)
│   │   ├── sync-master/          # Sync Master (Dyspraxia)
│   │   └── star-mapper/          # Star Mapper (NVLD)
│   ├── report/                   # AI diagnostic report page
│   ├── api/                      # API routes
│   │   ├── gemini/route.ts       # Gemini AI integration
│   │   ├── groq/route.ts         # Groq AI integration
│   │   └── session/route.ts      # Session management
│   ├── admin/                    # Admin dashboard
│   ├── profile/                  # Profile management
│   ├── synthetic/                # Synthetic data generation
│   └── test-db/                  # Database testing utilities
│
├── components/                   # React components
│   ├── games/                    # Game components
│   │   ├── MazeGame.tsx          # Canvas-based maze tracing
│   │   ├── PhonicFinder.tsx      # Web Speech API game
│   │   ├── CricketForge.tsx      # Quantity recognition
│   │   ├── PizzaParty.tsx        # Alternative dyscalculia game
│   │   ├── SyncMaster.tsx        # Rhythm catching game
│   │   ├── StarMapper.tsx        # Pattern memory game
│   │   └── DotConnect.tsx        # Visual-spatial processing
│   ├── ErrorBoundary.tsx         # Error handling
│   ├── MediaCapture.tsx          # Audio/video capture
│   └── OfflineDetector.tsx       # Network status monitoring
│
├── lib/                          # Core utility libraries
│   ├── biometrics/               # Biometric analysis algorithms
│   │   ├── mse-calculator.ts     # Mean Squared Error calculation
│   │   ├── jerk-analysis.ts      # Tremor detection (3rd derivative)
│   │   ├── gaze-entropy.ts       # Eye tracking entropy
│   │   ├── timing-metrics.ts     # Response time analysis
│   │   └── wall-hugging.ts       # Spatial vs motor dysgraphia
│   ├── ml/                       # Machine learning models
│   │   ├── hybrid-diagnostic-engine.ts     # Combined ML approach
│   │   └── conventional-classifiers.ts     # Traditional ML models
│   ├── gemini/                   # Google Gemini integration
│   │   ├── report-generator.ts   # AI report prompt engineering
│   │   └── level-generator.ts    # Adaptive difficulty AI
│   ├── supabase/                 # Database integration
│   │   ├── client.ts             # Supabase client setup
│   │   └── database.ts           # Database operations
│   ├── media-capture/            # Media handling utilities
│   └── media-store.ts            # Local media storage
│
├── stores/                       # Zustand state management
│   └── session-store.ts          # Global session state
│
├── hooks/                        # Custom React hooks
│   ├── index.ts                  # Hook exports
│   ├── useAudioInput.ts          # Audio input handling
│   ├── useSupabase.ts            # Supabase hook
│   └── useWebcam.ts              # Webcam access hook
│
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Global types (GameSession, BiometricMetrics, etc.)
│
├── data/                         # Static and generated data
│   └── synthetic/                # Synthetic test data for demos
│
├── public/                       # Static assets
│   ├── images/                   # Game images and icons
│   └── sounds/                   # Audio files
│
├── styles/                       # Additional styling
│
├── scripts/                      # Utility scripts
│
└── Configuration Files
    ├── package.json              # Dependencies and scripts
    ├── tsconfig.json             # TypeScript configuration
    ├── next.config.ts            # Next.js configuration
    ├── tailwind.config.js        # Tailwind CSS configuration
    ├── postcss.config.mjs        # PostCSS configuration
    └── eslint.config.mjs         # ESLint configuration
```

---

## 🎮 Games & Diagnostics

| 🎯 Game Name | 🧠 Target Disability | 🔍 Detection Focus | 📊 Key Metrics | ⏱️ Duration |
|-------------|---------------------|-------------------|---------------|------------|
| **The Maze** | Dysgraphia | Motor control & path accuracy | MSE, Jerk Analysis, Wall-Hugging Ratio | 2-3 min |
| **Phonic Finder** | Dyslexia | Phonological processing | Response Time, Accuracy, Confusion Patterns | 3-4 min |
| **Cricket Forge** | Dyscalculia | Number sense & quantity | Subitizing Threshold, Counting Delay | 2-3 min |
| **Sync Master** | Dyspraxia | Motor coordination & timing | Rhythm Lag, Coordination Score | 2-3 min |
| **Star Mapper** | NVLD | Visual-spatial memory | Pattern Recall, Gaze Entropy, Spatial Decay | 3-4 min |

### Biometric Algorithms

#### 1. **Mean Squared Error (MSE)**
```typescript
MSE = (1/N) * Σ[(x_actual - x_ideal)² + (y_actual - y_ideal)²]
```
Measures path deviation accuracy for dysgraphia detection.

#### 2. **Jerk Analysis**
```typescript
Jerk = d³position/dt³
```
Third derivative of position - detects sub-visual tremors and movement smoothness.

#### 3. **Wall-Hugging Ratio**
```typescript
Ratio = Collisions / ProximityEvents
```
- **High ratio** → Motor Dysgraphia (muscle control issues)
- **Low ratio** → Spatial Dysgraphia (perception issues)

#### 4. **Subitizing Threshold**
Tests instant recognition of quantities (1-5) without counting. Typical threshold: 3-4 items.

#### 5. **Gaze Entropy**
```typescript
Entropy = -Σ(p_i * log(p_i))
```
Shannon entropy of eye movement distribution - high entropy indicates chaotic, unfocused tracking.

---

## ⚙️ Configuration

### Database Setup (Optional)

NeuroGen Suite can work without a database, but Supabase provides cloud storage and sync.

#### Option 1: Use Supabase (Recommended for Production)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the schema from `supabase-schema.sql` in SQL Editor
4. Copy your project URL and anon key to `.env.local`

#### Option 2: Local Storage Only

Simply omit Supabase env variables - data will be stored in browser localStorage.

### API Configuration

#### Groq API (Recommended - Faster)
```env
GROQ_API_KEY=gsk_...
```
- Sign up at [console.groq.com](https://console.groq.com)
- Free tier: 30 requests/minute
- Model: llama-3.3-70b-versatile

#### Google Gemini API (Alternative)
```env
GEMINI_API_KEY=AIza...
```
- Get key at [aistudio.google.com](https://aistudio.google.com)
- Free tier: 15 requests/minute
- Model: gemini-1.5-flash

#### Email Configuration (Optional)
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
```
For Gmail: Enable 2FA and generate an App Password

📖 **See [API_KEYS_GUIDE.md](API_KEYS_GUIDE.md) for detailed instructions**

---

## 👥 Development Guide

### Team Structure

This project is designed for collaborative development with clear module separation.

### Coding Standards

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Formatting**: Consistent with project style
- **Components**: Functional components with hooks
- **State**: Zustand for global, useState for local
- **Styling**: Tailwind CSS utility classes

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally**
   ```bash
   npm run dev
   ```

3. **Lint your code**
   ```bash
   npm run lint
   ```

4. **Build to ensure no errors**
   ```bash
   npm run build
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

### Module Responsibilities

| Module | Files | Focus |
|--------|-------|-------|
| **Game Engine** | `components/games/` | Game mechanics, animations, interactions |
| **Biometrics** | `lib/biometrics/` | Algorithm implementation, data analysis |
| **AI Integration** | `lib/gemini/`, `lib/ml/` | AI prompts, ML models, report generation |
| **Data Layer** | `lib/supabase/`, `stores/` | Database, state management |
| **UI/UX** | `app/`, `components/` | Pages, layouts, responsive design |

---

## 🚀 Deployment

### Pre-Deployment Checklist

✅ **Before deploying to production:**

- [ ] All environment variables configured
- [ ] Database schema applied (if using Supabase)
- [ ] API keys tested and working
- [ ] Build completes without errors (`npm run build`)
- [ ] Critical user flows tested
- [ ] Error boundaries implemented
- [ ] Analytics configured (optional)
- [ ] Email notifications tested (optional)

📋 **See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete list**

### Deploy to Vercel (Recommended)

Vercel is the recommended platform as it's built by the Next.js team.

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - Add all variables from `.env.local`
   - At minimum, add one AI API key (GROQ_API_KEY or GEMINI_API_KEY)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://your-app.vercel.app`

### Alternative: Deploy to Other Platforms

#### Netlify
```bash
npm run build
# Deploy the .next folder
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

#### Custom Server
```bash
npm run build
npm run start
# Runs on port 3000
```

---

## 📚 Documentation

Comprehensive documentation is available in the repository:

| Document | Description |
|----------|-------------|
| **[API_KEYS_GUIDE.md](API_KEYS_GUIDE.md)** | Step-by-step guide to obtain free API keys |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture and design decisions |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Complete production deployment checklist |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Quick reference card for developers |
| **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** | Feature implementation status (95% complete) |
| **[START_HERE.md](START_HERE.md)** | 5-minute quick start guide |
| **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** | Detailed setup instructions |
| **[HYBRID_AI_IMPLEMENTATION.md](HYBRID_AI_IMPLEMENTATION.md)** | Hybrid AI diagnostic engine details |

---

## 📊 Version & Status

**Current Version:** `0.1.0`

**Development Status:** 🚀 Active Development (95% Production Ready)

### What's Working
✅ All 5 diagnostic games fully functional  
✅ Biometric data capture and analysis  
✅ AI-powered report generation (Gemini & Groq)  
✅ Session management and storage  
✅ PDF export and email notifications  
✅ Responsive UI across devices  
✅ Multi-language support (English, Malayalam, Hindi)  

### Roadmap (Future Versions)
- [ ] Advanced eye-tracking with WebGazer.js
- [ ] Speech-to-text integration for verbal assessments
- [ ] Parent/teacher dashboard
- [ ] Multi-session progress tracking
- [ ] Integration with clinical assessment tools
- [ ] Mobile app (React Native)

---

## 🏆 Hackathon Demo Flow

**Perfect 5-minute demo script:**

1. **Problem** (30s): Show statistics on LD detection challenges
2. **Solution** (30s): Explain "Stealth Assessment" concept
3. **Live Demo** (2 min):
   - Create child profile
   - Play The Maze game (30 seconds)
   - Show real-time biometric capture
4. **AI Report** (1 min): Display generated diagnostic report
5. **Impact** (1 min): Multi-language support, accessibility, scalability

📄 **See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for detailed presentation guide**

---

## 👥 Team Division (4 Members, 16 Hours)

### **Member 1: Game Engine Lead**
**Focus:** MazeGame, CricketForge  
**Files:** `components/games/MazeGame.tsx`, `components/games/CricketForge.tsx`

| Hour | Task |
|------|------|
| 1-2 | Review and polish MazeGame visuals |
| 3-6 | Enhance CricketForge animations and feedback |
| 7-10 | Add sound effects and particle effects |
| 11-14 | Mobile touch optimization |
| 15-16 | Cross-browser testing |

### **Member 2: Speech & Interaction Lead**
**Focus:** PhonicFinder, SyncMaster  
**Files:** `components/games/PhonicFinder.tsx`, `components/games/SyncMaster.tsx`

| Hour | Task |
|------|------|
| 1-2 | Test Web Speech API across browsers |
| 3-6 | Enhance PhonicFinder with more phonemes |
| 7-10 | Polish SyncMaster rhythm detection |
| 11-14 | Add visual feedback and animations |
| 15-16 | Edge case handling and error recovery |

### **Member 3: Data & Analytics Lead**
**Focus:** Biometrics, StarMapper, Data Layer  
**Files:** `lib/biometrics/*`, `components/games/StarMapper.tsx`, `stores/session-store.ts`

| Hour | Task |
|------|------|
| 1-2 | Review and validate biometric calculations |
| 3-6 | Enhance Supabase integration |
| 7-10 | Improve StarMapper pattern generation |
| 11-14 | Add Chart.js visualizations to report |
| 15-16 | Data validation and export testing |

### **Member 4: AI & UI Lead**
**Focus:** AI Integration, Landing Page, Reports  
**Files:** `lib/gemini/*`, `app/api/gemini/route.ts`, `app/page.tsx`, `app/report/page.tsx`

| Hour | Task |
|------|------|
| 1-2 | Set up and test AI API connections |
| 3-6 | Optimize report generation prompts |
| 7-10 | Design and polish landing page |
| 11-14 | Implement PDF export and email notifications |
| 15-16 | Final deployment to Vercel |

---

## 🧪 Testing

### Run Linter
```bash
npm run lint
```

### Build Test
```bash
npm run build
```

### Manual Testing Checklist
- [ ] All 5 games load without errors
- [ ] Biometric data captures correctly
- [ ] AI report generates successfully
- [ ] PDF export works
- [ ] Responsive on mobile/tablet
- [ ] Works offline (graceful degradation)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

MIT License

Copyright (c) 2026 NeuroGen Suite Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

---

## 🙏 Credits & Acknowledgments

### Technologies
- **[Next.js](https://nextjs.org/)** - React framework by Vercel
- **[React](https://reactjs.org/)** - UI library by Meta
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management
- **[Pixi.js](https://pixijs.com/)** - 2D WebGL rendering engine
- **[Chart.js](https://www.chartjs.org/)** - Data visualization library
- **[Supabase](https://supabase.com/)** - Open source Firebase alternative

### AI Services
- **[Google Gemini](https://ai.google.dev/)** - Generative AI for report creation
- **[Groq](https://groq.com/)** - Fast LLM inference

### Fonts & Design
- **[Lexend](https://www.lexend.com/)** - Font designed for reading accessibility

### Inspiration
- Clinical research in learning disability detection
- Game-based assessment methodologies
- Accessibility-first design principles

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/allenalex1246end/nexus_app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/allenalex1246end/nexus_app/discussions)

---

## 🎉 Built for AI Samasya 2026

NeuroGen Suite is our submission to the AI Samasya 2026 Hackathon, addressing the critical need for accessible, anxiety-free learning disability detection.

**Our Mission:** Make early LD detection available to every child, regardless of geographic or economic barriers.

---

<div align="center">

**⭐ Star this repository if you find it useful!**

Made with ❤️ by the NeuroGen Suite Team

</div>
