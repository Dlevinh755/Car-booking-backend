# Test all services health endpoints

Write-Host "Testing Car Booking System Services" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

$services = @(
    @{Name="API Gateway"; URL="http://localhost:3000/health"},
    @{Name="Auth Service"; URL="http://localhost:3001/health"},
    @{Name="User Service"; URL="http://localhost:3002/health"},
    @{Name="Booking Service"; URL="http://localhost:3003/health"},
    @{Name="Ride Service"; URL="http://localhost:3004/health"},
    @{Name="Driver Service"; URL="http://localhost:3005/health"},
    @{Name="Pricing Service"; URL="http://localhost:3007/health"},
    @{Name="Review Service"; URL="http://localhost:3008/health"},
    @{Name="Notification Service"; URL="http://localhost:3009/health"}
)

$allHealthy = $true

foreach ($service in $services) {
    Write-Host "Checking $($service.Name)... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $service.URL -Method Get -TimeoutSec 5 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ OK" -ForegroundColor Green
        } else {
            Write-Host "✗ FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            $allHealthy = $false
        }
    }
    catch {
        Write-Host "✗ NOT RESPONDING" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""
if ($allHealthy) {
    Write-Host "All services are healthy! ✓" -ForegroundColor Green
} else {
    Write-Host "Some services are not responding. Please check if they are running." -ForegroundColor Yellow
    Write-Host "Run .\start-all-services.ps1 to start all services" -ForegroundColor Yellow
}
Write-Host ""
