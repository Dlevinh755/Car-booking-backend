# Debug Booking Creation Issue
# This script will help identify where the booking creation fails

Write-Host "=== BOOKING CREATION DEBUG TOOL ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if user is logged in
Write-Host "[1/6] Checking authentication..." -ForegroundColor Yellow
Write-Host "Please provide your access token from browser localStorage"
Write-Host "How to get: Open DevTools (F12) > Console > Type: localStorage.getItem('car_booking_access_token')"
Write-Host ""
$token = Read-Host "Enter your access token (or press Enter to skip)"
Write-Host ""

# Step 2: Test API Gateway
Write-Host "[2/6] Testing API Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get -UseBasicParsing
    Write-Host "  API Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "  API Gateway: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test Booking Service
Write-Host "[3/6] Testing Booking Service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -Method Get -UseBasicParsing
    Write-Host "  Booking Service: OK" -ForegroundColor Green
} catch {
    Write-Host "  Booking Service: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Test through API Gateway
Write-Host "[4/6] Testing routing through API Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/bookings/health" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  Routing: OK" -ForegroundColor Green
    } else {
        Write-Host "  Routing: Unexpected status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  Routing: 404 - Service route may not be configured" -ForegroundColor Red
    } else {
        Write-Host "  Routing: Error $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Try creating a test booking
Write-Host "[5/6] Testing booking creation..." -ForegroundColor Yellow

if ($token) {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    $bookingData = @{
        pickup = @{
            lat = 10.7769
            lng = 106.7009
            addressText = "Test Pickup Location"
        }
        dropoff = @{
            lat = 10.8231
            lng = 106.6297
            addressText = "Test Dropoff Location"
        }
        note = "Debug test booking"
    } | ConvertTo-Json
    
    Write-Host "  Sending request to: http://localhost:3000/api/bookings" -ForegroundColor Gray
    Write-Host "  Payload: $bookingData" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/bookings" -Method Post -Headers $headers -Body $bookingData -ContentType "application/json" -UseBasicParsing
        Write-Host "  SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED! Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Error Response: $errorBody" -ForegroundColor Red
    }
} else {
    Write-Host "  Skipped (no token provided)" -ForegroundColor Yellow
    Write-Host "  To test with authentication, run this script again with your token" -ForegroundColor Yellow
}

# Step 6: Check service logs
Write-Host ""
Write-Host "[6/6] Recent service logs..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== API Gateway Logs ===" -ForegroundColor Cyan
docker logs api-gateway --tail 10
Write-Host ""
Write-Host "=== Booking Service Logs ===" -ForegroundColor Cyan  
docker logs booking-service --tail 10

Write-Host ""
Write-Host "=== DEBUGGING TIPS ===" -ForegroundColor Cyan
Write-Host "1. If you see 404: Check API Gateway routing configuration"
Write-Host "2. If you see 401: Check if you're logged in and token is valid"
Write-Host "3. If you see 500: Check booking-service logs for errors"
Write-Host "4. Watch live logs: docker logs booking-service -f"
Write-Host "5. Check database: docker exec -it mysql_db mysql -umy_user -pmy_password -e 'USE booking_db; SHOW TABLES;'"
Write-Host ""
