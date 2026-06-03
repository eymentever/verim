@echo off
chcp 65001 >nul
:: ================================================================
::  Verim App — GitHub Push Script  (Windows CMD)
::
::  ADIMLAR:
::  1. https://github.com/new → Repo adı: verim-app
::     (README ekleme, boş bırak → Create repository)
::  2. Bu .bat dosyasına çift tıkla
::  3. Git kullanıcı adı/şifre sorulursa GitHub bilgilerini gir
::     (veya Personal Access Token kullan)
:: ================================================================

set GITHUB_USER=eymentever
set REPO_NAME=verim-app
set REMOTE=https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo.
echo ================================================
echo   Verim App ^-^> GitHub Push
echo   %REMOTE%
echo ================================================
echo.

:: Proje klasörüne geç (.bat ile aynı dizin)
cd /d "%~dp0"
echo [1/6] Klasor: %CD%

:: Git init
echo [2/6] Git baslatiliyor...
git init
git config user.email "eymentever@gmail.com"
git config user.name "Mustafa Eymen"
git branch -M main

:: .gitignore
echo [3/6] .gitignore yaziliyor...
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

:: Stage all
echo [4/6] Dosyalar ekleniyor...
git add -A
git status --short | find /c ""
echo dosya staged.

:: Commit
echo [5/6] Commit yapiliyor...
git commit -m "feat: Verim v1.0 — Production-Ready Mobile App" 2>nul || echo "(commit zaten mevcut, atlandı)"

:: Remote & push
echo [6/6] GitHub remote ekleniyor ve push ediliyor...
git remote remove origin 2>nul
git remote add origin %REMOTE%
git push -u origin main

echo.
echo ================================================
echo   TAMAMLANDI!
echo   https://github.com/%GITHUB_USER%/%REPO_NAME%
echo ================================================
pause
