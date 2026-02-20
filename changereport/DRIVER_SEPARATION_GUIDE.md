# Hướng dẫn: Tách tài khoản User và Driver

## Những gì đã thay đổi

### 1. Database Schema
- **drivers table**: Thêm cột `user_id` để link với auth account
- **vehicles table**: Thêm các cột `vehicle_type`, `license_number`, `is_active`

### 2. Backend (Driver Service)
- **driverController.js**: Accept thêm các field `userId`, `vehicleType`, `licenseNumber`
- **driverRepository.js**: 
  - Update `createDriver()` để hỗ trợ `userId`
  - Update `createVehicle()` để hỗ trợ `vehicleType`, `licenseNumber`, `is_active`
  - Thêm function `findByUserId()` để tìm driver theo auth user_id

### 3. Frontend
- **DriverRegister.jsx**: Trang đăng ký mới cho tài xế với form:
  - Thông tin cá nhân: fullName, phone, email, password
  - Thông tin xe: vehicleType (bike/4-seater/7-seater), licensePlate, licenseNumber
  
- **AuthContext.jsx**: Thêm `registerDriver()` function:
  1. Tạo auth account với role='driver'
  2. Tạo driver profile với userId từ auth account
  
- **Dashboard.jsx**: Auto redirect driver về `/driver` (DriverPanel)

- **Navigation**: Updated các link để phân biệt đăng ký user vs driver

### 4. Flow đăng ký Driver mới
```
1. User điền form tại /driver/register
2. Frontend gọi POST /api/auth/register với role='driver'
3. Frontend nhận userId từ auth response
4. Frontend gọi POST /api/drivers/register với userId + thông tin xe
5. Driver profile được tạo với status='pending'
6. Toast: "Đăng ký tài xế thành công! Vui lòng chờ phê duyệt."
```

### 5. Flow login cho Driver
```
1. Driver login bằng phone/email + password
2. JWT token chứa role='driver'
3. Dashboard check role và redirect về /driver (DriverPanel)
4. DriverPanel hiển thị các chức năng dành cho tài xế
```

## Cách chạy

### Bước 1: Start Docker Desktop
Đảm bảo Docker Desktop đang chạy.

### Bước 2: Start services
```powershell
docker-compose up -d
```

### Bước 3: Run migration
```powershell
.\scripts\run-migration.ps1
```

Migration sẽ:
- Thêm cột `user_id` vào bảng `drivers`
- Thêm các cột `vehicle_type`, `license_number`, `is_active` vào bảng `vehicles`

### Bước 4: Rebuild driver-service
```powershell
docker-compose up -d --build driver-service
```

### Bước 5: Test
1. Mở http://localhost:5173
2. Click "Đăng ký làm tài xế"
3. Điền form và submit
4. Kiểm tra console logs và database

## Kiểm tra Database

```sql
USE driver_db;

-- Check drivers table structure
DESCRIBE drivers;

-- Check vehicles table structure  
DESCRIBE vehicles;

-- View driver registrations
SELECT d.*, v.* 
FROM drivers d 
LEFT JOIN vehicles v ON d.id = v.driver_id;
```

## API Endpoints

### POST /api/drivers/register
Register driver với auth account đã có.

**Request Body:**
```json
{
  "userId": "uuid-from-auth",
  "fullName": "Nguyen Van A",
  "phone": "0123456789",
  "vehicleType": "4-seater",
  "plateNumber": "29A-12345",
  "licenseNumber": "0123456789",
  "make": "Toyota",
  "model": "Vios",
  "color": "White"
}
```

**Response:**
```json
{
  "message": "Driver registered successfully",
  "data": {
    "id": "driver-uuid",
    "userId": "user-uuid",
    "fullName": "Nguyen Van A",
    "phone": "0123456789",
    "status": "pending",
    "vehicle": {
      "vehicleType": "4-seater",
      "plateNumber": "29A-12345",
      "licenseNumber": "0123456789"
    }
  }
}
```

## Troubleshooting

### Migration fails
```powershell
# Check if MySQL container is running
docker ps | Select-String mysql

# Check MySQL logs
docker logs car-booking-mysql-1

# Manually run migration
Get-Content migrations\001_add_driver_user_link.sql | docker exec -i car-booking-mysql-1 mysql -umy_user -pmy_password
```

### Driver registration fails
1. Check frontend console for errors
2. Check driver-service logs: `docker logs car-booking-driver-service-1`
3. Verify migration was applied successfully
4. Check database schema matches expected structure

### Driver not redirected to DriverPanel
1. Check JWT token contains `role: 'driver'`
2. Verify Dashboard.jsx has redirect logic
3. Check AuthContext properly sets user.role from token
