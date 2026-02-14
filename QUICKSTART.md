# Quick Start Guide - Car Booking System

## Khởi động nhanh (Quick Start)

### Bước 1: Cài đặt dependencies
```powershell
.\install-all.ps1
```

### Bước 2: Khởi động tất cả services
```powershell
.\start-all-services.ps1
```

### Bước 3: Kiểm tra health check
```powershell
.\test-services.ps1
```

hoặc:
```bash
curl http://localhost:3000/health
```

### Bước 4: Test API

Import file `postman_collection.json` vào Postman để test tất cả API endpoints.

## Sử dụng Docker

### Khởi động với Docker Compose:
```bash
docker-compose up -d
```

### Xem logs:
```bash
docker-compose logs -f
```

### Dừng services:
```bash
docker-compose down
```

## API Endpoints

### API Gateway: http://localhost:3000

Tất cả requests đi qua API Gateway:

- **Auth**: `/api/auth/*` → Port 3001
- **Users**: `/api/users/*` → Port 3002  
- **Bookings**: `/api/bookings/*` → Port 3003
- **Rides**: `/api/rides/*` → Port 3004
- **Drivers**: `/api/drivers/*` → Port 3005
- **Payments**: `/api/payments/*` → Port 3006
- **Pricing**: `/api/pricing/*` → Port 3007
- **Reviews**: `/api/reviews/*` → Port 3008
- **Notifications**: `/api/notifications/*` → Port 3009

## Ví dụ sử dụng (Examples)

### 1. Đăng ký user mới
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

### 2. Đăng nhập
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 3. Tạo booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"pickupLocation":"Address A","dropoffLocation":"Address B"}'
```

### 4. Tạo driver
```bash
curl -X POST http://localhost:3000/api/drivers \
  -H "Content-Type: application/json" \
  -d '{"name":"Mike Driver","email":"mike@example.com","licenseNumber":"DL123456","vehicleNumber":"ABC-1234"}'
```

### 5. Tính giá cước
```bash
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"distance":10,"duration":20,"vehicleType":"sedan"}'
```

### 6. Tạo review
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"rideId":1,"driverId":1,"rating":5,"comment":"Great!"}'
```

## Cấu trúc hệ thống (System Architecture)

```
Client Requests
      ↓
API Gateway (Port 3000)
      ↓
┌─────┴─────────────────────────────────────┐
│                                             │
↓         ↓         ↓         ↓         ↓     ↓
Auth    User    Booking   Ride    Driver  ...
(3001)  (3002)   (3003)  (3004)   (3005)
```

## Files quan trọng (Important Files)

- `install-all.ps1` - Script cài đặt dependencies cho tất cả services
- `start-all-services.ps1` - Script khởi động tất cả services
- `test-services.ps1` - Script test health check của services
- `postman_collection.json` - Postman collection để test API
- `docker-compose.yml` - Docker Compose configuration
- `SERVICES_README.md` - Documentation chi tiết

## Xử lý lỗi (Troubleshooting)

### Port đã được sử dụng:
Kiểm tra và kill process đang dùng port:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Services không kết nối được:
1. Kiểm tra tất cả services đang chạy
2. Chạy `.\test-services.ps1` để xem service nào bị lỗi
3. Xem logs của service bị lỗi

### Module không tìm thấy:
Chạy lại:
```powershell
.\install-all.ps1
```

## Next Steps

1. ✅ Basic microservices đã setup
2. ⏭ Tích hợp database (MySQL/MongoDB)
3. ⏭ Implement JWT authentication
4. ⏭ Add input validation
5. ⏭ Setup monitoring & logging
6. ⏭ Add unit tests
7. ⏭ Setup CI/CD

Đọc thêm trong `SERVICES_README.md` để biết thêm chi tiết!
