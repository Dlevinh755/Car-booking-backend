# Stop all services
Write-Host "🛑 Stopping Car Booking System..." -ForegroundColor Cyan
Write-Host ""

docker-compose down

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stop services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All services stopped successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 To remove volumes (reset database), run:" -ForegroundColor Yellow
Write-Host "   docker-compose down -v" -ForegroundColor White
