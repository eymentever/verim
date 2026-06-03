# ================================================================
#  Verim App — GitHub Push Script  (PowerShell)
#  PowerShell'de çalıştır:
#    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#    .\github_push.ps1
# ================================================================

$GITHUB_USER = "eymentever"
$REPO_NAME   = "verim-app"
$REMOTE      = "https://github.com/$GITHUB_USER/$REPO_NAME.git"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Verim App -> GitHub Push" -ForegroundColor White
Write-Host "  $REMOTE" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Proje klasörüne geç
Set-Location $PSScriptRoot

# Git init
Write-Host "[1/6] Git başlatılıyor..." -ForegroundColor Yellow
git init
git config user.email "eymentever@gmail.com"
git config user.name "Mustafa Eymen"
git branch -M main

# .gitignore
Write-Host "[2/6] .gitignore yazılıyor..." -ForegroundColor Yellow
@"
node_modules/
.expo/
dist/
*.log
.env
.env.local
ios/
android/
.DS_Store
"@ | Set-Content .gitignore

# Stage
Write-Host "[3/6] Dosyalar ekleniyor..." -ForegroundColor Yellow
git add -A
$count = (git diff --cached --name-only | Measure-Object).Count
Write-Host "   $count dosya staged." -ForegroundColor Green

# Commit
Write-Host "[4/6] Commit yapılıyor..." -ForegroundColor Yellow
git commit -m "feat: Verim v1.0 — Production-Ready Mobile App

Su & Dogalgaz sayac takip uygulamasi.
Expo Router + TypeScript + Zustand + AsyncStorage.

- OCR parser (su: 5-7, gaz: 5-8 regex)
- ISKI 2026 kademeli tarife + CTV + KDV
- EPDK 2026 gaz (m3 -> kWh donusumu)
- Freemium: Free/Pro/Landlord/Enterprise + RevenueCat IAP
- expo-camera + permissions + auto-torch
- expo-notifications: anomali + kacak uyarisi
- Intl.NumberFormat tr-TR formatTRY()
- Sifreli AsyncStorage (XOR+Base64)
- Offline queue + prepaid sayac + sosyal benchmark
- Cyber dark tema + SVG ring gauges + Eco Score
- Istanbul/Ankara/Izmir tarife motoru (80+ ilce)" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "   (Commit zaten mevcut, atlandı)" -ForegroundColor Gray
}

# Remote & push
Write-Host "[5/6] Remote ekleniyor: $REMOTE" -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $REMOTE

Write-Host "[6/6] Push ediliyor..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  TAMAMLANDI!" -ForegroundColor Green
Write-Host "  https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Devam etmek için Enter'a bas"
