-- 1. Bảng Khách hàng (Lưu thông tin cơ bản để link với Booking)
CREATE TABLE IF NOT EXISTS Users (
    user_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- 2. Bảng Tài xế
CREATE TABLE IF NOT EXISTS Drivers (
    driver_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL, -- Biển số xe
    vehicle_type ENUM('4-seater', '7-seater', 'bike') DEFAULT '4-seater',
    is_active BOOLEAN DEFAULT TRUE,            -- Tài xế có đang bật app không
    is_available BOOLEAN DEFAULT TRUE,         -- Tài xế có đang rảnh để nhận khách không
    current_lat DECIMAL(10, 8),                -- Vị trí hiện tại (Vĩ độ)
    current_lng DECIMAL(11, 8),                -- Vị trí hiện tại (Kinh độ)
    last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Bảng Booking (Trái tim của hệ thống)
CREATE TABLE IF NOT EXISTS Bookings (
    booking_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    driver_id CHAR(36) DEFAULT NULL,               -- Null khi đang chờ tài xế nhận
    
    -- Địa điểm (Sử dụng Decimal hoặc Point nếu dùng MySQL 8.0+)
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    
    distance_km DECIMAL(5, 2),                 -- Quãng đường dự kiến
    duration_min INT,                          -- Thời gian dự kiến
    
    -- Trạng thái và Thanh toán
    status ENUM('PENDING', 'MATCHING', 'CONFIRMED', 'PICKING_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    fare_amount DECIMAL(15, 2) NOT NULL,       -- Giá tiền
    payment_status ENUM('UNPAID', 'PAID', 'REFUNDED') DEFAULT 'UNPAID',
    payment_method ENUM('CASH', 'VNPAY', 'E-WALLET') DEFAULT 'CASH',
    
    idempotency_key VARCHAR(100) UNIQUE,       -- Chống đặt trùng đơn khi lag mạng
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Khóa ngoại
    FOREIGN KEY (customer_id) REFERENCES Users(user_id),
    FOREIGN KEY (driver_id) REFERENCES Drivers(driver_id)
);

-- 4. Bảng Lịch sử trạng thái (Để theo dõi log của chuyến xe)
CREATE TABLE IF NOT EXISTS Booking_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id CHAR(36) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);

-- Index để tìm kiếm nhanh tài xế đang rảnh ở gần (Quan trọng cho performance)
CREATE INDEX idx_driver_availability ON Drivers(is_active, is_available);
CREATE INDEX idx_booking_status ON Bookings(status);