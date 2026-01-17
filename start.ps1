#!/usr/bin/env pwsh
# NeuroGen Suite - One-Click Launcher
# AI Samasya 2026

param(
    [switch]$Build,
    [switch]$Prod,
    [switch]$Test
)

$ErrorActionPreference = "Stop"

Write-Host "`n" -NoNewline
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧠 NeuroGen Suite - Quick Launcher      ║" -ForegroundColor Cyan
Write-Host "║  AI Samasya 2026 Hackathon               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local has API keys
$envPath = ".env.local"
$hasApiKey = $false

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "GROQ_API_KEY=gsk_" -or $envContent -match "GEMINI_API_KEY=AIza") {
        Write-Host "✅ API keys detected!" -ForegroundColor Green
        $hasApiKey = $true
    } else {
        Write-Host "⚠️  WARNING: No API keys configured!" -ForegroundColor Yellow
        Write-Host "   AI report generation will fail without keys.`n" -ForegroundColor Yellow
        Write-Host "   Quick fix: Run these commands:" -ForegroundColor White
        Write-Host "   1. Get free key: https://console.groq.com/keys" -ForegroundColor Cyan
        Write-Host "   2. Edit .env.local" -ForegroundColor Cyan
        Write-Host "   3. Add: GROQ_API_KEY=gsk_your_key_here`n" -ForegroundColor Cyan
        
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "`n❌ Startup cancelled. Configure API keys first." -ForegroundColor Red
            exit 1
        }
    }
}

# Test Mode - Run verification
if ($Test) {
    Write-Host "`n🧪 Running system tests...`n" -ForegroundColor Cyan
    & .\test-system.ps1
    exit 0
}

# Build Mode - Production build
if ($Build) {
    Write-Host "`n🏗️  Building production bundle...`n" -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build complete!" -ForegroundColor Green
        Write-Host "   Start production server: .\start.ps1 -Prod`n" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Build failed! Check errors above.`n" -ForegroundColor Red
        exit 1
    }
    exit 0
}

# Production Mode - Start production server
if ($Prod) {
    if (-not (Test-Path ".next")) {
        Write-Host "`n❌ Production build not found!" -ForegroundColor Red
        Write-Host "   Run build first: .\start.ps1 -Build`n" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "`n🚀 Starting production server...`n" -ForegroundColor Cyan
    Write-Host "   URL: http://localhost:3000" -ForegroundColor Green
    Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray
    npm start
    exit 0
}

# Default Mode - Development server
Write-Host "`n🔧 Starting development server...`n" -ForegroundColor Cyan
Write-Host "   Local:   http://localhost:3000" -ForegroundColor Green
Write-Host "   Network: http://$($(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress):3000" -ForegroundColor Green
Write-Host "`n   Press Ctrl+C to stop`n" -ForegroundColor Gray

if (-not $hasApiKey) {
    Write-Host "⚠️  REMINDER: Configure API keys for full functionality`n" -ForegroundColor Yellow
}

Write-Host "📱 Testing on mobile? Use the Network URL above`n" -ForegroundColor Cyan
Write-Host "🎮 Game flow: Home → Profile → Games → Report`n" -ForegroundColor White

npm run dev
