# Restart specific service or all services
param(
    [string]$Service = ""
)

Write-Host "🔄 Restarting services..." -ForegroundColor Cyan
Write-Host ""

if ($Service) {
    Write-Host "Service: $Service" -ForegroundColor Yellow
    docker-compose restart $Service
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Service restarted successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to restart $Service" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "All services" -ForegroundColor Yellow
    docker-compose restart
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All services restarted successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to restart services" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📊 Current status:" -ForegroundColor Cyan
docker-compose ps
