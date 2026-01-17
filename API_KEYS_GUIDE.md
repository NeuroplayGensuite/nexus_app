# 🔑 API Keys Setup Guide - NeuroGen Suite

## Get Your Free API Keys (No Credit Card Required!)

### Option 1: Groq (RECOMMENDED - Fastest)

**Speed:** ⚡⚡⚡ Ultra-fast (2-3 seconds per report)  
**Free Tier:** 14,400 requests/day  
**Model:** llama-3.3-70b-versatile

**Steps:**
1. Go to: https://console.groq.com
2. Sign up with Google/GitHub (instant)
3. Go to "API Keys" in left sidebar
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)
6. Paste in `.env.local`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

---

### Option 2: Google Gemini (Alternative)

**Speed:** ⚡⚡ Fast (5-8 seconds per report)  
**Free Tier:** 60 requests/minute  
**Model:** gemini-1.5-flash

**Steps:**
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Select "Create API key in new project"
5. Copy the key (starts with `AIza...`)
6. Paste in `.env.local`:
   ```
   GEMINI_API_KEY=AIzaSy_your_key_here
   ```

---

## Quick Config Commands

### Windows PowerShell:

```powershell
# Open .env.local in Notepad
notepad .env.local

# Or edit in VS Code
code .env.local
```

### After adding key, verify:

```powershell
# Test API connection
node test-groq-api.js
# OR
node test-api.js
```

---

## Minimal .env.local Example:

```env
# Just add ONE of these (choose Groq for best performance)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx

# Everything else is optional for local development
```

---

## 🎯 For Hackathon Demo:

**Use Groq** because:
- ✅ Instant signup (no verification)
- ✅ 2-3 second report generation
- ✅ 14,400 free requests/day
- ✅ Works perfectly in live demos
- ✅ No rate limit issues during presentation

---

## 🚨 Troubleshooting:

### "API Key Invalid"
- Check for spaces before/after the key
- Ensure no quotes around the key
- Key format: `GROQ_API_KEY=gsk_...` (no spaces)

### "Rate Limit Exceeded"
- Switch to the other API (Groq ↔ Gemini)
- Wait 60 seconds
- Check your usage in the provider dashboard

### "Network Error"
- Check internet connection
- Verify API key is active in dashboard
- Try restarting dev server: `Ctrl+C` then `npm run dev`

---

## ✅ Verification Steps:

1. Add API key to `.env.local`
2. Save the file
3. Restart dev server: `Ctrl+C` then `npm run dev`
4. Go to http://localhost:3000
5. Play 1-2 games
6. Visit `/report` - should see AI-generated content within 10 seconds

---

## 🎬 For Video Demo:

Pre-generate a report BEFORE recording:
1. Create test profile
2. Play all games
3. Generate report
4. Take screenshots of PDF
5. Now record your walkthrough with cached data

This ensures smooth demo even if API is slow during recording!

---

**Need help?** Check:
- Groq Docs: https://console.groq.com/docs
- Gemini Docs: https://ai.google.dev/gemini-api/docs
