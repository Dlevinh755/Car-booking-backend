# Run database migrations
# Usage: .\scripts\run-migration.ps1

Write-Host "Running database migrations..." -ForegroundColor Cyan

# Wait for MySQL to be ready
Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $result = docker exec car-booking-mysql-1 mysqladmin ping -h localhost -u my_user -pmy_password 2>&1
    if ($result -match "mysqld is alive") {
        Write-Host "MySQL is ready!" -ForegroundColor Green
        break
    }
    $attempt++
    Start-Sleep -Seconds 2
    Write-Host "Waiting... ($attempt/$maxAttempts)" -ForegroundColor Yellow
}

if ($attempt -eq $maxAttempts) {
    Write-Host "ERROR: MySQL did not become ready in time" -ForegroundColor Red
    exit 1
}

# Run migration
Write-Host "Applying migration..." -ForegroundColor Cyan
Get-Content migrations\001_add_driver_user_link.sql | docker exec -i car-booking-mysql-1 mysql -umy_user -pmy_password

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
