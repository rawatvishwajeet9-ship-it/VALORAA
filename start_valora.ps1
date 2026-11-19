# VALORA Healthcare Platform PowerShell Launcher (Offline / Localhost)
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  VALORA Healthcare Platform - Offline / Localhost Launcher" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "[INFO] VALORA is already running on http://127.0.0.1:5000 !" -ForegroundColor Green
    Write-Host "Opening browser..." -ForegroundColor Yellow
    Start-Process "http://127.0.0.1:5000/login.html"
    exit
}

Write-Host "Starting VALORA server on http://127.0.0.1:5000..." -ForegroundColor Yellow
try {
    python app.py
} catch {
    py app.py
}
