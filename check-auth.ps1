# Quick guide to check localStorage
Write-Host "=== CAR BOOKING - CHECK AUTHENTICATION STATUS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open browser DevTools (F12) > Console and run these commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Check if you're logged in:" -ForegroundColor Green
Write-Host "   localStorage.getItem('car_booking_access_token')" -ForegroundColor White
Write-Host ""
Write-Host "2. Check your user info:" -ForegroundColor Green
Write-Host "   JSON.parse(localStorage.getItem('car_booking_user'))" -ForegroundColor White
Write-Host ""
Write-Host "3. Check refresh token:" -ForegroundColor Green
Write-Host "   localStorage.getItem('car_booking_refresh_token')" -ForegroundColor White
Write-Host ""
Write-Host "4. View all Car Booking data:" -ForegroundColor Green
Write-Host "   Object.keys(localStorage).filter(k => k.includes('car_booking')).forEach(k => console.log(k + ':', localStorage.getItem(k)))" -ForegroundColor White
Write-Host ""
Write-Host "=== TROUBLESHOOTING ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If tokens are null/undefined:" -ForegroundColor Yellow
Write-Host "  1. You're not logged in - go to http://localhost:5173 and login"
Write-Host "  2. Tokens expired - logout and login again"
Write-Host "  3. Clear cache and hard reload (Ctrl+Shift+R)"
Write-Host ""
Write-Host "If login doesn't work:" -ForegroundColor Yellow
Write-Host "  1. Check service logs: docker logs auth-service --tail 20"
Write-Host "  2. Check user exists: docker exec -it mysql_db mysql -umy_user -pmy_password -e ""SELECT * FROM auth_db.auth_accounts;"""
Write-Host "  3. Try registering a new account with phone starting with 0 (e.g., 0912345678)"
Write-Host ""
