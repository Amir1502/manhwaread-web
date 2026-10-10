# ManhwaRead Windows Auto-Pinger
param(
    [string]$Url = "https://manhwaread-web-9zyh.onrender.com/",
    [int]$IntervalMinutes = 5
)

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 ManhwaRead Auto-Pinger (PowerShell)" -ForegroundColor Green
Write-Host "🎯 URL:       $Url" -ForegroundColor White
Write-Host "⏰ Интервал:  каждые $IntervalMinutes мин." -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan

$count = 0

while ($true) {
    $count++
    $now = Get-Date -Format "HH:mm:ss"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 45
        $sw.Stop()
        Write-Host "[$now] ✅ Ping #$count : HTTP $($res.StatusCode) за $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
    }
    catch {
        $sw.Stop()
        Write-Host "[$now] ⚠️ Ping #$count : $($_.Exception.Message) ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Yellow
    }

    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
