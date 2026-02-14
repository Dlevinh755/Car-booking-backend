# Start all services for local development

Write-Host "Starting Car Booking System - All Services" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

$services = @(
    @{Name="Auth Service"; Path="services\auth-service"; Port=3001},
    @{Name="User Service"; Path="services\user-service"; Port=3002},
    @{Name="Booking Service"; Path="services\booking-service"; Port=3003},
    @{Name="Ride Service"; Path="services\ride-service"; Port=3004},
    @{Name="Driver Service"; Path="services\driver-service"; Port=3005},
    @{Name="Pricing Service"; Path="services\pricing-service"; Port=3007},
    @{Name="Review Service"; Path="services\review-service"; Port=3008},
    @{Name="Notification Service"; Path="services\notification-service"; Port=3009},
    @{Name="API Gateway"; Path="api-gateway"; Port=3000}
)

# Start each service in a new PowerShell window
foreach ($service in $services) {
    Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan
    
    $scriptBlock = "cd '$PSScriptRoot\$($service.Path)'; npm start; Read-Host 'Press Enter to close'"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Service endpoints:" -ForegroundColor Yellow
Write-Host "  - API Gateway:          http://localhost:3000" -ForegroundColor White
Write-Host "  - Auth Service:         http://localhost:3001" -ForegroundColor White
Write-Host "  - User Service:         http://localhost:3002" -ForegroundColor White
Write-Host "  - Booking Service:      http://localhost:3003" -ForegroundColor White
Write-Host "  - Ride Service:         http://localhost:3004" -ForegroundColor White
Write-Host "  - Driver Service:       http://localhost:3005" -ForegroundColor White
Write-Host "  - Pricing Service:      http://localhost:3007" -ForegroundColor White
Write-Host "  - Review Service:       http://localhost:3008" -ForegroundColor White
Write-Host "  - Notification Service: http://localhost:3009" -ForegroundColor White
Write-Host ""
Write-Host "Check health: curl http://localhost:3000/health" -ForegroundColor Yellow
Write-Host ""
