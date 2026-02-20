# Car Booking Frontend - React + Vite

Giao diện web MVP cho hệ thống đặt xe taxi microservices, được xây dựng với React 18, Vite, TailwindCSS, và TanStack Query.

## 🚀 Công nghệ sử dụng

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **TanStack Query (React Query)** - Data fetching & caching
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **TailwindCSS** - Utility-first CSS
- **React Hot Toast** - Toast notifications

## 📁 Cấu trúc thư mục

```
frontend/
├── public/              # Static files
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Layout.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── FormField.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Loading.jsx
│   │   └── ErrorState.jsx
│   ├── context/         # React contexts
│   │   └── AuthContext.jsx
│   ├── features/        # Feature modules (API + hooks)
│   │   ├── booking/
│   │   │   ├── bookingApi.js
│   │   │   └── bookingHooks.js
│   │   ├── ride/
│   │   │   ├── rideApi.js
│   │   │   └── rideHooks.js
│   │   ├── payment/
│   │   │   ├── paymentApi.js
│   │   │   └── paymentHooks.js
│   │   └── driver/
│   │       ├── driverApi.js
│   │       └── driverHooks.js
│   ├── lib/             # Core utilities
│   │   ├── api.js       # Axios instance + interceptors
│   │   ├── auth.js      # Token storage helpers
│   │   └── validators.js # Zod schemas
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── BookingCreate.jsx
│   │   ├── BookingDetail.jsx
│   │   ├── RideDetail.jsx
│   │   ├── PaymentResult.jsx
│   │   └── DriverPanel.jsx
│   ├── App.jsx          # Root component with routing
│   ├── main.jsx         # Entry point
│   └── styles.css       # Global styles
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── README.md            # This file
```

## 🔧 Cài đặt

### Yêu cầu

- Node.js 18+ và npm
- Backend API Gateway đang chạy tại `http://localhost:3000`

### Các bước cài đặt

1. **Di chuyển vào thư mục frontend:**
   ```bash
   cd frontend
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Cấu hình environment:**
   ```bash
   # Copy file .env.example thành .env
   cp .env.example .env
   
   # Chỉnh sửa .env nếu cần (mặc định đã đúng)
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. **Chạy development server:**
   ```bash
   npm run dev
   ```

5. **Mở trình duyệt:**
   - Ứng dụng sẽ tự động mở tại: `http://localhost:5173`

## 📝 Scripts

```bash
# Chạy development server
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🎯 Tính năng chính

### 1. Xác thực (Authentication)

- **Đăng ký:** Tạo tài khoản mới với họ tên, số điện thoại, email (optional), và mật khẩu
- **Đăng nhập:** Sử dụng số điện thoại hoặc email
- **Auto refresh token:** Tự động làm mới token khi hết hạn
- **Persistent session:** Lưu session qua localStorage

### 2. Dashboard

- Hiển thị thông tin user
- Xem booking gần nhất
- Xem ride gần nhất
- Quick actions (Tạo booking, Driver panel)

### 3. Tạo Booking

- Form nhập điểm đón và điểm đến:
  - Latitude, Longitude (tọa độ GPS)
  - Địa chỉ text
- Ghi chú cho tài xế (optional)
- Tự động:
  - Tính giá ước tính
  - Tìm tài xế gần nhất
  - Tạo ride

### 4. Chi tiết Booking

- Hiển thị thông tin booking
- Trạng thái: requested → searching → assigned → completed/cancelled
- Giá ước tính
- Thông tin tài xế
- Auto-refresh mỗi 3 giây
- Cho phép hủy booking

### 5. Chi tiết Ride

- Hiển thị thông tin ride
- Trạng thái: created → arrived → picked_up → in_progress → completed/cancelled
- Khoảng cách, thời gian, tổng cước
- Nút thanh toán VNPay (khi completed)
- Auto-refresh mỗi 3 giây

### 6. Thanh toán VNPay

- Tạo payment URL
- Redirect sang VNPay
- Xử lý kết quả thanh toán
- Hiển thị chi tiết giao dịch

### 7. Driver Panel

- Toggle online/offline
- Cập nhật vị trí hiện tại
- Cập nhật trạng thái ride:
  - Arrived (đã đến điểm đón)
  - Picked up (đã đón khách)
  - In progress (đang di chuyển)
  - Completed (hoàn thành)
  - Cancelled (hủy)

## 🔐 Xử lý Authentication

### Token Flow

1. **Login:**
   - Gọi `POST /auth/login`
   - Lưu accessToken và refreshToken vào localStorage
   - Load thông tin user từ `GET /auth/me`

2. **Authenticated Requests:**
   - Axios interceptor tự động attach `Authorization: Bearer <token>`
   - Mọi request đều có header này

3. **Token Refresh:**
   - Khi API trả 401 (Unauthorized)
   - Tự động gọi `POST /auth/refresh` với refreshToken
   - Lưu accessToken mới
   - Retry request ban đầu
   - Nếu refresh fail → logout và redirect về /login

4. **Logout:**
   - Xóa toàn bộ tokens khỏi localStorage
   - Redirect về trang login

### Code Reference

```javascript
// lib/api.js - Axios interceptors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Auto refresh token
      // Retry original request
    }
    return Promise.reject(error);
  }
);
```

## 🌊 Luồng sử dụng hoàn chỉnh

### Luồng User (Khách hàng)

1. **Đăng ký/Đăng nhập**
   - Vào `/register` hoặc `/login`
   - Nhập thông tin và submit

2. **Tạo Booking**
   - Vào Dashboard → "Tạo Booking Mới"
   - Nhập tọa độ + địa chỉ điểm đón/đến
   - VD:
     - Pickup: `10.762622, 106.660172` - "123 Nguyễn Huệ, Q1, TP.HCM"
     - Dropoff: `10.772622, 106.680172` - "456 Lê Lợi, Q1, TP.HCM"
   - Submit → Nhận booking với giá ước tính

3. **Theo dõi Booking**
   - Vào `/booking/:id`
   - Xem trạng thái (searching → assigned)
   - Thấy thông tin tài xế khi assigned

4. **Theo dõi Ride**
   - Vào `/ride/:id`
   - Xem trạng thái (created → arrived → picked_up → in_progress → completed)
   - Theo dõi khoảng cách, thời gian

5. **Thanh toán**
   - Khi ride completed, nhấn "Thanh toán qua VNPay"
   - Redirect sang VNPay sandbox
   - Thanh toán thử nghiệm
   - Quay lại `/payment/result` xem kết quả

### Luồng Driver (Tài xế)

1. **Đăng nhập**
   - Sử dụng tài khoản driver (hoặc tạo mới)

2. **Đặt Online**
   - Vào Driver Panel
   - Nhập vị trí hiện tại (optional)
   - Bấm "Đặt Online"

3. **Nhận chuyến**
   - Hệ thống tự động assign booking cho driver gần nhất

4. **Cập nhật trạng thái Ride**
   - Nhập Ride ID
   - Chọn trạng thái:
     - **Arrived:** Khi đến điểm đón
     - **Picked Up:** Khi khách lên xe
     - **In Progress:** Khi bắt đầu di chuyển
     - **Completed:** Khi đến nơi
   - Submit

5. **Hoàn thành**
   - Trạng thái Completed → hệ thống tự tính cước
   - Nhắc khách thanh toán

## 🧪 Test thủ công

### 1. Test Authentication

```bash
# 1. Đăng ký user mới
- Vào /register
- Nhập: Nguyễn Văn A, 0912345678, test@example.com, password123
- Submit → Toast "Đăng ký thành công"

# 2. Đăng nhập
- Vào /login
- Nhập: 0912345678, password123
- Submit → Redirect về /dashboard
```

### 2. Test Complete Booking Flow

```bash
# 1. Tạo booking
- Vào /booking/create
- Sử dụng tọa độ mẫu (đã điền sẵn):
  Pickup: 10.762622, 106.660172, "123 Nguyễn Huệ, Q1"
  Dropoff: 10.772622, 106.680172, "456 Lê Lợi, Q1"
- Submit → Nhận Booking ID + Ride ID

# 2. Xem booking
- Click "Xem chi tiết Booking"
- Quan sát status, estimated fare
- Status sẽ thay đổi: requested → searching → assigned

# 3. Xem ride
- Click "Xem chi tiết Ride"
- Thấy thông tin ride, driver

# 4. (Mở tab khác) Driver cập nhật
- Vào /driver
- Nhập Ride ID vừa tạo
- Chọn status: "arrived"
- Submit → Tab ride tự refresh hiển thị "Đã đến điểm đón"
- Tiếp tục: picked_up → in_progress → completed

# 5. Xem ride sau khi completed
- Thấy khoảng cách, thời gian, tổng cước
- Nhấn "Thanh toán qua VNPay"

# 6. VNPay
- Redirect sang sandbox VNPay
- Nhập thông tin test card (theo VNPay docs)
- Hoàn thành thanh toán
- Redirect về /payment/result
- Xem kết quả: thành công/thất bại
```

### 3. Test Validation

```bash
# Thử submit form thiếu thông tin
- Các field required: hiển thị error messages
- Phone sai format: "Số điện thoại không hợp lệ"
- Lat/Lng không hợp lệ: "Tọa độ không hợp lệ"
- Password < 6 ký tự: "Mật khẩu phải có ít nhất 6 ký tự"
```

### 4. Test Auto-refresh

```bash
# Booking/Ride detail tự động refresh mỗi 3s
- Mở /booking/:id hoặc /ride/:id
- (Tab khác) Cập nhật status từ driver panel
- (Tab gốc) Sau 3s tự động cập nhật không cần F5
```

## 🐛 Xử lý lỗi phổ biến

### 1. Backend không chạy

**Lỗi:** Network error, Connection refused

**Giải pháp:**
```bash
# Kiểm tra backend đang chạy
curl http://localhost:3000/health

# Nếu không chạy, start backend
cd ../
docker-compose up -d
# hoặc chạy từng service
```

### 2. CORS Error

**Lỗi:** CORS policy blocked

**Giải pháp:**
- Kiểm tra API Gateway có cấu hình CORS
- Đảm bảo `VITE_API_BASE_URL` đúng trong `.env`

### 3. 401 Unauthorized

**Lỗi:** Unauthorized sau khi refresh page

**Giải pháp:**
- Token có thể đã hết hạn
- Đăng xuất và đăng nhập lại
- Clear localStorage: `localStorage.clear()`

### 4. Booking không tìm thấy driver

**Lỗi:** Status = "no_drivers_available"

**Giải pháp:**
- Đảm bảo có driver online trong bán kính 5km
- Vào Driver Panel → Đặt online
- Nhập lat/lng gần điểm đón

### 5. VNPay redirect không về

**Lỗi:** Sau thanh toán VNPay không redirect về

**Giải pháp:**
- Kiểm tra `VNP_RETURN_URL` trong backend .env
- Phải là: `http://localhost:5173/payment/result`

## 🎨 Customization

### Thay đổi màu chủ đạo

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        // Thay đổi màu primary tại đây
        500: '#your-color',
        600: '#your-color',
        // ...
      }
    }
  }
}
```

### Thay đổi API base URL

```bash
# .env
VITE_API_BASE_URL=https://your-api-url.com
```

### Thêm tính năng mới

1. Tạo API function trong `features/[feature]/[feature]Api.js`
2. Tạo React Query hook trong `features/[feature]/[feature]Hooks.js`
3. Tạo page component trong `pages/[Feature].jsx`
4. Thêm route trong `App.jsx`

## 📱 Responsive Design

- UI responsive trên desktop, tablet, mobile
- Sử dụng Tailwind breakpoints: `sm:`, `md:`, `lg:`
- Navbar collapse trên mobile (có thể mở rộng thêm)

## 🚀 Production Build

```bash
# Build cho production
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder lên hosting (Vercel, Netlify, etc.)
```

## 🔗 API Endpoints được sử dụng

### Auth
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get user info

### Booking
- `POST /bookings` - Tạo booking
- `GET /bookings/:id` - Chi tiết booking
- `POST /bookings/:id/cancel` - Hủy booking

### Ride
- `GET /rides/:id` - Chi tiết ride
- `POST /rides/:id/status` - Cập nhật trạng thái

### Payment
- `POST /payments/vnpay/create` - Tạo payment URL
- `GET /payments/vnpay/return` - VNPay return handler
- `GET /payments/:id` - Chi tiết payment

### Driver
- `POST /drivers/presence` - Cập nhật online/offline
- `GET /drivers/me` - Thông tin driver

## 📚 Tài liệu tham khảo

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)
- [TailwindCSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

## 💡 Tips

1. **React Query DevTools:** Bật trong dev mode để debug queries
2. **Toast Notifications:** Tất cả thành công/lỗi đều có toast
3. **Form Validation:** Zod schemas được reuse ở nhiều nơi
4. **Auto-refresh:** Booking/Ride detail tự động refetch mỗi 3s
5. **Error Boundary:** Có thể thêm React Error Boundary để catch errors

## 🤝 Contributing

Đây là MVP nên còn nhiều chỗ có thể cải thiện:
- Thêm map thật (Google Maps, Mapbox)
- Realtime updates (WebSocket)
- Push notifications
- File upload (avatar, driver license)
- Chat giữa user và driver
- Ride history với pagination
- Search và filter
- Dashboard analytics
- Dark mode

---

**Developed with ❤️ for Car Booking Microservices MVP**
