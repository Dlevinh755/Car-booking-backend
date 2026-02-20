# 🚕 Taxi Booking Microservices Platform

A complete MVP taxi booking system built with microservices architecture using Node.js, Express, MySQL, and Docker Compose.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [API Documentation](#api-documentation)
- [Complete Booking Flow](#complete-booking-flow)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

This system consists of 10 microservices:

```
         ┌─────────────────┐
         │  Frontend Web   │  (Port 5173) - React UI
         │  (React+Vite)   │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   API Gateway   │  (Port 3000) - Entry point
         └────────┬────────┘
                  │
    ┌─────────────┴───────────────────┐
    │                                 │
┌───▼───────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│   Auth    │  │   User   │  │  Driver  │  │ Pricing │
│  (3001)   │  │  (3002)  │  │  (3005)  │  │  (3007) │
└───────────┘  └──────────┘  └──────────┘  └─────────┘
                                                   │
┌──────────┐  ┌──────────┐  ┌──────────┐          │
│ Booking  │  │   Ride   │  │ Payment  │◄─────────┘
│  (3003)  │  │  (3004)  │  │  (3006)  │
└──────────┘  └──────────┘  └──────────┘
       │             │             │
       └─────────────┴─────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼──────┐       ┌───────▼────────┐
    │Notification│       │     Review     │
    │  (3009)    │       │    (3008)      │
    │  (Stub)    │       │    (Stub)      │
    └────────────┘       └────────────────┘
```

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **Authentication**: JWT (Access + Refresh Tokens)
- **Password Hashing**: bcrypt (10 rounds)
- **Payment Gateway**: VNPay (HMAC SHA512)
- **Distance Calculation**: Haversine Formula
- **Containerization**: Docker & Docker Compose

**Frontend:**
- **UI Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Styling**: TailwindCSS
- **Notifications**: React Hot Toast

## ✨ Features

### Implemented Features

✅ **Authentication & Authorization**
- User registration with JWT tokens
- Login with access token (15 min) + refresh token (30 days)
- Role-based access control (user, driver, admin)
- Secure password hashing with bcrypt

✅ **User Management**
- User profile CRUD operations
- Internal user creation endpoint for auth-service

✅ **Driver Management**
- Driver registration with vehicle information
- Driver online/offline presence tracking
- GPS location updates
- Nearby driver search (Haversine-based, 20km radius)

✅ **Distance-Based Pricing**
- Configurable pricing rules (base fare, per km, minimum fare)
- Route factor adjustment (1.30x for realistic routes)
- Distance rounding to km steps
- Surge and night multipliers
- Currency rounding (100 VND)
- Transparent breakdown JSON

✅ **Booking Orchestration**
- Create booking → Get pricing quote → Find nearby drivers → Assign driver → Create ride
- Booking status tracking (requested, searching, assigned, pricing_failed, no_drivers_available)
- Booking events history

✅ **Ride Management**
- Ride status lifecycle (created, arrived, picked_up, in_progress, completed, cancelled)
- Automatic fare calculation on completion
- Ride duration and distance tracking
- Status events history

✅ **VNPay Payment Integration**
- Create payment URL with HMAC SHA512 signature
- Handle payment return callback
- IPN (Instant Payment Notification) webhook
- Payment status tracking (pending, completed, failed)

🔜 **Stub Services** (for future implementation)
- Notification service (email, SMS, push)
- Review & rating service

## 📦 Prerequisites

- **Docker** (20.10+)
- **Docker Compose** (1.29+)
- **Node.js** 18+ (for local development)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash

# Frontend environment
cp frontend/.env.example frontend/.env
```

**Important**: Update VNPay credentials in `services/payment-service/.env`:
```env
VNP_TMN_CODE=<your_vnpay_tmn_code>
VNP_HASH_SECRET=<your_vnpay_hash_secret>
```

### 3. Start All Services (Backend + Frontend)

```bash
# Start all services with Docker Compose
docker-compose up -d
```

Wait for MySQL initialization (30-60 seconds).

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080

### 5. Test the Complete Flow

1. **Open Frontend**: Navigate to http://localhost:5173
2. **Register**: Create a new user account
3. **Login**: Sign in with your credentials
4. **Create Booking**: 
   - Enter pickup and dropoff coordinates
   - Submit booking to get fare estimate
   - System auto-assigns nearest driver
5. **Track Ride**: Monitor ride status in real-time
6. **Payment**: Complete payment via VNPay when ride finishes

### 6. Verify Services

```bash
# Check all services are running
docker-compose ps

# Check API Gateway health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:5173
``` Tech Stack |
|---------|------|-------------|----------|------------|
| **Frontend** | **5173** | **React web UI** | - | **React + Vite + TailwindCSS** |
| API Gateway | 3000 | Routes all requests | - | Node.js + Express |
| Auth Service | 3001 | JWT authentication | auth_db | Node.js + Express |
| User Service | 3002 | User management | user_db | Node.js + Express |
| Booking Service | 3003 | Booking orchestration | booking_db | Node.js + Express |
| Ride Service | 3004 | Ride lifecycle | ride_db | Node.js + Express |
| Driver Service | 3005 | Driver & vehicle mgmt | driver_db | Node.js + Express |
| Payment Service | 3006 | VNPay integration | payment_db | Node.js + Express |
| Pricing Service | 3007 | Fare calculation | pricing_db | Node.js + Express |
| Review Service | 3008 | Reviews (stub) | - | Node.js + Express |
| Notification Service | 3009 | Notifications (stub) | - | Node.js + Express |
| MySQL Database | 3306 | Data persistence | 7 databases | MySQL 8.0 |
| phpMyAdmin | 8080 | Database admin UI | - | phpMyAdmin

### 8. Development Mode (Frontend Only)

If you want to run frontend locally with hot reload:

```bash
cd frontend
npm install
npm run dev
curl http://localhost:3000/health
```

### 5. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
```

## 🔧 Services

| Service | Port | Description | Database |
|---------|------|-------------|----------|
| API Gateway | 3000 | Routes all requests | - |
| Auth Service | 3001 | JWT authentication | auth_db |
| User Service | 3002 | User management | user_db |
| Booking Service | 3003 | Booking orchestration | booking_db |
| Ride Service | 3004 | Ride lifecycle | ride_db |
| Driver Service | 3005 | Driver & vehicle mgmt | driver_db |
| Payment Service | 3006 | VNPay integration | payment_db |
| Pricing Service | 3007 | Fare calculation | pricing_db |
| Review Service | 3008 | Reviews (stub) | - |
| Notification Service | 3009 | Notifications (stub) | - |

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "phone": "0912345678",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "identifier": "john@example.com",
  "password": "SecurePassword123"
}
```

### Driver Endpoints

#### Register Driver
```bash
POST /drivers/register
Content-Type: application/json

{
  "fullName": "Jane Driver",
  "phone": "0987654321",
  "email": "jane@example.com",
  "vehicle": {
    "plateNumber": "29A-12345",
    "make": "Toyota",
    "model": "Vios",
    "color": "White",
    "year": 2022
  }
}
```

#### Update Driver Presence
```bash
POST /drivers/presence
Content-Type: application/json

{
  "driverId": "uuid",
  "isOnline": true,
  "lat": 10.762622,
  "lng": 106.660172
}
```

#### Find Nearby Drivers
```bash
GET /drivers/nearby?lat=10.762622&lng=106.660172&radius=5000&limit=10
```

### Booking Endpoints

#### Create Booking (Orchestration)
```bash
POST /bookings
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "userId": "uuid",
  "pickupLat": 10.762622,
  "pickupLng": 106.660172,
  "dropoffLat": 10.772622,
  "dropoffLng": 106.670172,
  "notes": "Please call when you arrive"
}
```

This will:
1. Create booking
2. Get pricing quote
3. Find nearby drivers
4. Assign driver
5. Create ride

### Ride Endpoints

#### Update Ride Status
```bash
POST /rides/:id/status
Content-Type: application/json

{
  "status": "completed",
  "lat": 10.772622,
  "lng": 106.670172
}
```

Valid statuses: `created`, `arrived`, `picked_up`, `in_progress`, `completed`, `cancelled`

### Payment Endpoints

#### Create VNPay Payment URL
```bash
POST /payments/vnpay/create
Content-Type: application/json

{
  "rideId": "uuid",
  "amount": 94000,
  "returnUrl": "http://localhost:3000/payment/vnpay/return"
}
```

## 🔄 Complete Booking Flow

### Step 1: Register User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "phone": "0912345678",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

### Step 2: Register Driver

```bash
curl -X POST http://localhost:3000/drivers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Driver",
    "phone": "0987654321",
    "email": "jane@example.com",
    "vehicle": {
      "plateNumber": "29A-12345",
      "make": "Toyota",
      "model": "Vios",
      "color": "White",
      "year": 2022
    }
  }'
```

### Step 3: Driver Goes Online

```bash
curl -X POST http://localhost:3000/drivers/presence \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "<driver_id>",
    "isOnline": true,
    "lat": 10.762622,
    "lng": 106.660172
  }'
```

### Step 4: User Creates Booking

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "userId": "<user_id>",
    "pickupLat": 10.762622,
    "pickupLng": 106.660172,
    "dropoffLat": 10.772622,
    "dropoffLng": 106.670172
  }'
```

### Step 5: Driver Updates Ride Status

```bash
# Driver arrived
curl -X POST http://localhost:3000/rides/<ride_id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "arrived"}'

# Passenger picked up
curl -X POST http://localhost:3000/rides/<ride_id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "picked_up"}'

# Ride completed (automatically calculates final fare)
curl -X POST http://localhost:3000/rides/<ride_id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Step 6: Create Payment

```bash
curl -X POST http://localhost:3000/payments/vnpay/create \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "<ride_id>",
    "amount": 94000
  }'
```

## ⚙️ Environment Configuration

See `.env.example` files in each service directory.

### Key Environment Variables

**Database (All Services)**
```env
DB_HOST=mysql
DB_USER=taxi_user
DB_PASS=taxi_password
DB_NAME=<service>_db
```

**JWT (Auth & User Services)**
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
```

**VNPay (Payment Service)**
```env
VNP_TMN_CODE=YOUR_TMN_CODE
VNP_HASH_SECRET=YOUR_HASH_SECRET
```

## 🗄️ Database Schema

See [init.sql](init.sql) for complete schema.

### Key Tables

- **auth_accounts**: User credentials with bcrypt hashed passwords
- **users**: User profiles
- **drivers**: Driver information
- **vehicles**: Vehicle details
- **driver_presence**: Real-time driver location
- **pricing_rules**: Configurable pricing
- **pricing_quotes**: Pre-ride fare estimates
- **pricing_fares**: Final ride fares
- **bookings**: Booking records
- **rides**: Ride details
- **payments**: Payment records

## 🧮 Pricing Calculation

The pricing algorithm:

1. Calculate raw distance using Haversine formula
2. Apply route factor (1.30x)
3. Round to nearest km
4. Calculate: `base_fare + (km × per_km) + booking_fee`
5. Apply minimum fare
6. Apply surge and night multipliers
7. Round to currency unit (100 VND)

**Example**: 5.3 km ride
- Raw: 5,300 m
- Adjusted: 6,890 m (×1.30)
- Rounded: 7 km
- Fare: 10,000 + (7 × 12,000) = **94,000 VND**

## 🔍 Troubleshooting

### Services won't start

```bash
docker-compose down
docker-compose up -d
```

### MySQL connection errors

Wait 30-60 seconds for initialization, then restart services.

### Port conflicts

Check ports in `docker-compose.yml` and adjust if needed.

### VNPay payment fails

Verify credentials in `services/payment-service/.env`.

### No drivers available

- Ensure driver is registered
- Driver must be online (`/drivers/presence`)
- Driver must be within radius (default 5km)

## 📝 Development

### Local Development

```bash
cd services/auth-service
npm install
cp .env.example .env
npm run dev
```

### Hot Reload

All services use `nodemon` for development.

## 🤝 Contributing

See Git workflow in original README for team collaboration guidelines.

## 📄 License

MIT License

---

**Built with ❤️ using Node.js, Express, MySQL, and Docker**
