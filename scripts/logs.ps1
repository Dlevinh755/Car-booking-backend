# View logs for all services or specific service
param(
    [string]$Service = ""
)

Write-Host "📋 Viewing logs..." -ForegroundColor Cyan
Write-Host ""

if ($Service) {
    Write-Host "Service: $Service" -ForegroundColor Yellow
    docker-compose logs -f $Service
} else {
    Write-Host "All services (press Ctrl+C to exit)" -ForegroundColor Yellow
    docker-compose logs -f
}
