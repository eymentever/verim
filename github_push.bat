@echo off
REM ================================================================
REM  Verim App — GitHub Push Script
REM  Adımlar:
REM  1. GitHub'a git: https://github.com/new
REM  2. Repo adı: verim-app
REM  3. Private veya Public seç, README ekleme
REM  4. "Create repository" tıkla
REM  5. Bu scripti proje klasöründe çalıştır
REM ================================================================

set GITHUB_USER=eymentever
set REPO_NAME=verim-app

echo.
echo ====================================================
echo  Verim App — GitHub Push
echo  Repo: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo ====================================================
echo.

echo [1/6] Git repo baslatiliyor...
git init
git config user.email "eymentever@gmail.com"
git config user.name "Mustafa Eymen"
git branch -M main

echo [2/6] .gitignore ayarlaniyor...
(
  echo node_modules/
  echo .expo/
  echo dist/
  echo *.log
  echo .env
  echo .env.local
  echo ios/
  echo android/
  echo .DS_Store
) > .gitignore

echo [3/6] Tum dosyalar staged ediliyor...
git add -A

echo [4/6] Ilk commit...
git commit -m "feat: Verim v1.0 — complete scaffold

- Expo Router + TypeScript + Zustand + AsyncStorage
- Cyber dark tema (#070A13 bg, cyan, orange, neon green)
- Dashboard: SVG ring gauges, floating FABs, anomali uyarisi
- Scanner: glow grid, auto-torch, animasyonlu scan line
- Analytics: Eco-Savings Score, Green Badge, enerji tavsiyeleri
- Freemium: Free/Pro/Landlord/Enterprise + RevenueCat IAP
- Tariff Engine: Istanbul/Ankara/Izmir kademeli tarife
- Marketplace: affiliate oneriler, komisyon mantigi
- Offline queue, prepaid sayac, PDF devir tutanagi
- Sosyal benchmark (sehir ortalamasiyla karsilastirma)"

echo [5/6] Remote ekleniyor...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo [6/6] GitHub'a push ediliyor...
git push -u origin main

echo.
echo ====================================================
echo  TAMAMLANDI!
echo  https://github.com/%GITHUB_USER%/%REPO_NAME%
echo ====================================================
pause
