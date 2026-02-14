# Install dependencies for all services

Write-Host "Installing dependencies for all services..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

$services = @(
    "api-gateway",
    "services\auth-service",
    "services\user-service",
    "services\booking-service",
    "services\ride-service",
    "services\driver-service",
    "services\pricing-service",
    "services\review-service",
    "services\notification-service"
)

foreach ($service in $services) {
    Write-Host "Installing dependencies for $service..." -ForegroundColor Cyan
    Push-Location $service
    npm install
    Pop-Location
    Write-Host "✓ $service dependencies installed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "All dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start all services by running:" -ForegroundColor Yellow
Write-Host "  .\start-all-services.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or start them with Docker:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
