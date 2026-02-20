# Quick test to create a booking
# Run this to test booking creation directly

Write-Host "Testing Booking Creation..." -ForegroundColor Cyan
Write-Host ""

# Test data
$bookingData = @{
    pickup = @{
        lat = 10.7769
        lng = 106.7009
        addressText = "Ben Thanh Market, Ho Chi Minh City"
    }
    dropoff = @{
        lat = 10.8231
        lng = 106.6297
        addressText = "Tan Son Nhat Airport"  
    }
    note = "Test booking from script"
} | ConvertTo-Json

Write-Host "Request Data:" -ForegroundColor Yellow
Write-Host $bookingData
Write-Host ""

# Get token from user
Write-Host "To test, you need to be logged in." -ForegroundColor Yellow
Write-Host "1. Open browser and login"
Write-Host "2. Open DevTools (F12) > Console"
Write-Host "3. Type: localStorage.getItem('car_booking_access_token')"
Write-Host "4. Copy the token (without quotes)"
Write-Host ""
$token = Read-Host "Paste your access token here"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host ""
Write-Host "Sending request to http://localhost:3000/api/bookings..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/bookings" -Method Post -Headers $headers -Body $bookingData -ContentType "application/json"
    
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Checking service logs..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== API Gateway Logs ===" -ForegroundColor Cyan
    docker logs api-gateway --tail 5
    Write-Host ""
    Write-Host "=== Booking Service Logs ===" -ForegroundColor Cyan
    docker logs booking-service --tail 5
}
