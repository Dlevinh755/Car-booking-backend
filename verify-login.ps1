# Verify Login and Token Saving
Write-Host "=== LOGIN VERIFICATION TOOL ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please follow these steps carefully:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Open your browser at http://localhost:5173" -ForegroundColor Cyan
Write-Host "Step 2: Open DevTools (press F12)" -ForegroundColor Cyan
Write-Host "Step 3: Go to Console tab" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 4: Check if you're logged in - Copy and paste this:" -ForegroundColor Cyan
Write-Host "  localStorage.getItem('car_booking_user')" -ForegroundColor White
Write-Host ""
Write-Host "  If this returns null → You need to login" -ForegroundColor Yellow
Write-Host "  If this shows user data → You're logged in" -ForegroundColor Green
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

Write-Host "Step 5: Check your access token - Copy and paste this:" -ForegroundColor Cyan
Write-Host "  localStorage.getItem('car_booking_access_token')" -ForegroundColor White
Write-Host ""
Write-Host "  If this returns null → Token not saved (login issue)" -ForegroundColor Yellow
Write-Host "  If this shows a long string → Token is saved correctly" -ForegroundColor Green
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

Write-Host "Step 6: If both are null, you need to LOGIN:" -ForegroundColor Cyan
Write-Host "  1. Go to the Login page" -ForegroundColor White
Write-Host "  2. Enter phone number (must start with 0, like: 0912345678)" -ForegroundColor White
Write-Host "  3. Enter password" -ForegroundColor White
Write-Host "  4. Click Login" -ForegroundColor White
Write-Host ""

Write-Host "Step 7: After successful login, check CONSOLE for logs:" -ForegroundColor Cyan
Write-Host "  You should see: 'Login successful'" -ForegroundColor Green
Write-Host "  Then check localStorage again" -ForegroundColor White
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

Write-Host "Step 8: Verify token was saved - Run these in Console:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  // Check all car_booking data" -ForegroundColor Gray
Write-Host "  Object.keys(localStorage).filter(k => k.startsWith('car_booking')).forEach(k => {" -ForegroundColor White
Write-Host "    console.log(k + ':', localStorage.getItem(k) ? 'SET ✓' : 'NOT SET ✗')" -ForegroundColor White
Write-Host "  })" -ForegroundColor White
Write-Host ""

Write-Host "  Expected output:" -ForegroundColor Gray
Write-Host "    car_booking_access_token: SET ✓" -ForegroundColor Green
Write-Host "    car_booking_refresh_token: SET ✓" -ForegroundColor Green
Write-Host "    car_booking_user: SET ✓" -ForegroundColor Green
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host

Write-Host "=== TROUBLESHOOTING ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If login succeeds but token is NOT saved:" -ForegroundColor Yellow
Write-Host "  → There may be an issue in AuthContext.jsx login function" -ForegroundColor Red
Write-Host "  → Check browser Console for JavaScript errors" -ForegroundColor Red
Write-Host "  → Check Network tab for API response" -ForegroundColor Red
Write-Host ""

Write-Host "If login fails with error:" -ForegroundColor Yellow
Write-Host "  → Check phone format (must start with 0)" -ForegroundColor Red
Write-Host "  → Check password is correct" -ForegroundColor Red
Write-Host "  → Check auth-service logs: docker logs auth-service --tail 20" -ForegroundColor Red
Write-Host ""

Write-Host "If you don't have an account yet:" -ForegroundColor Yellow
Write-Host "  → Go to /register page" -ForegroundColor White
Write-Host "  → Create account with phone starting with 0" -ForegroundColor White
Write-Host "  → Use a strong password" -ForegroundColor White
Write-Host ""

Write-Host "After completing these steps, your access token should be:" -ForegroundColor Cyan
$accessToken = Read-Host "Paste your access token here (from localStorage)"

if ($accessToken) {
    Write-Host ""
    Write-Host "Great! Your token: $($accessToken.Substring(0, [Math]::Min(20, $accessToken.Length)))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Now you can test booking creation with:" -ForegroundColor Cyan
    Write-Host "  .\test-booking.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "No token entered. Please follow the steps above to login first." -ForegroundColor Yellow
    Write-Host ""
}
