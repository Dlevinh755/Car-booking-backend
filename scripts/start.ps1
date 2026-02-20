# Start all services (backend + frontend)
Write-Host "🚀 Starting Car Booking System..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "📦 Starting services with Docker Compose..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check services status
Write-Host ""
Write-Host "📊 Services Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ System started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  API Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "  phpMyAdmin:  http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:     docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop system:   docker-compose down" -ForegroundColor White
Write-Host "  Restart:       docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Wait 30-60 seconds for MySQL initialization before using the app" -ForegroundColor Yellow
