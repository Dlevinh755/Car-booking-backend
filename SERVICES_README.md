# Car Booking System - Microservices Architecture

## Overview
This is a microservices-based car booking system with the following services:

### Services
- **API Gateway** (Port 3000) - Main entry point for all API requests
- **Auth Service** (Port 3001) - Authentication and authorization
- **User Service** (Port 3002) - User management
- **Booking Service** (Port 3003) - Booking management
- **Ride Service** (Port 3004) - Ride management
- **Driver Service** (Port 3005) - Driver management
- **Payment Service** (Port 3006) - Payment processing
- **Pricing Service** (Port 3007) - Dynamic pricing calculations
- **Review Service** (Port 3008) - Driver and ride reviews
- **Notification Service** (Port 3009) - Notifications (email, SMS, push)

## Architecture

All client requests go through the API Gateway which routes them to the appropriate microservice:

```
Client → API Gateway (3000) → Service (300X)
```

API routes:
- `/api/auth/*` → Auth Service
- `/api/users/*` → User Service
- `/api/bookings/*` → Booking Service
- `/api/rides/*` → Ride Service
- `/api/drivers/*` → Driver Service
- `/api/payments/*` → Payment Service
- `/api/pricing/*` → Pricing Service
- `/api/reviews/*` → Review Service
- `/api/notifications/*` → Notification Service

## Getting Started

### Prerequisites
- Node.js 14+
- npm or yarn
- Docker and Docker Compose (for containerized deployment)

### Local Development

1. **Install dependencies for all services:**
```bash
# API Gateway
cd api-gateway && npm install

# Services
cd services/auth-service && npm install
cd ../user-service && npm install
cd ../booking-service && npm install
cd ../ride-service && npm install
cd ../driver-service && npm install
cd ../pricing-service && npm install
cd ../review-service && npm install
cd ../notification-service && npm install
```

2. **Start services individually:**

```bash
# Terminal 1 - Auth Service
cd services/auth-service && npm start

# Terminal 2 - User Service
cd services/user-service && npm start

# Terminal 3 - Booking Service
cd services/booking-service && npm start

# Terminal 4 - Ride Service
cd services/ride-service && npm start

# Terminal 5 - Driver Service
cd services/driver-service && npm start

# Terminal 6 - Pricing Service
cd services/pricing-service && npm start

# Terminal 7 - Review Service
cd services/review-service && npm start

# Terminal 8 - Notification Service
cd services/notification-service && npm start

# Terminal 9 - API Gateway
cd api-gateway && npm start
```

3. **Or use development mode with auto-reload:**
```bash
npm run dev
```

### Docker Deployment

1. **Build and start all services:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f
```

3. **Stop all services:**
```bash
docker-compose down
```

## API Examples

### Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Users
```bash
# Get all users
curl http://localhost:3000/api/users

# Get user by ID
curl http://localhost:3000/api/users/1

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","phone":"1234567890"}'
```

### Bookings
```bash
# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"pickupLocation":"Address A","dropoffLocation":"Address B"}'

# Get all bookings
curl http://localhost:3000/api/bookings

# Get bookings for specific user
curl http://localhost:3000/api/bookings?userId=1
```

### Rides
```bash
# Create ride
curl -X POST http://localhost:3000/api/rides \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"pickupLocation":"Address A","dropoffLocation":"Address B","estimatedPrice":25.50}'

# Assign driver
curl -X PATCH http://localhost:3000/api/rides/1/assign-driver \
  -H "Content-Type: application/json" \
  -d '{"driverId":1}'

# Update ride status
curl -X PATCH http://localhost:3000/api/rides/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'
```

### Drivers
```bash
# Create driver
curl -X POST http://localhost:3000/api/drivers \
  -H "Content-Type: application/json" \
  -d '{"name":"Mike Driver","email":"mike@example.com","licenseNumber":"DL123456","vehicleNumber":"ABC-1234"}'

# Update driver availability
curl -X PATCH http://localhost:3000/api/drivers/1/availability \
  -H "Content-Type: application/json" \
  -d '{"available":true}'
```

### Pricing
```bash
# Calculate price
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"distance":10,"duration":20,"vehicleType":"sedan"}'

# Estimate price by coordinates
curl -X POST http://localhost:3000/api/pricing/estimate \
  -H "Content-Type: application/json" \
  -d '{"pickupLat":40.7128,"pickupLng":-74.0060,"dropoffLat":40.7580,"dropoffLng":-73.9855}'
```

### Reviews
```bash
# Create review
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"rideId":1,"driverId":1,"rating":5,"comment":"Great driver!"}'

# Get driver average rating
curl http://localhost:3000/api/reviews/driver/1/average
```

### Notifications
```bash
# Send notification
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"title":"Ride Confirmed","message":"Your ride has been confirmed","type":"info"}'

# Send email
curl -X POST http://localhost:3000/api/notifications/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Booking Confirmation","body":"Your booking is confirmed"}'
```

## Health Checks

Each service has a health check endpoint:
- API Gateway: http://localhost:3000/health
- Auth Service: http://localhost:3001/health
- User Service: http://localhost:3002/health
- Booking Service: http://localhost:3003/health
- Ride Service: http://localhost:3004/health
- Driver Service: http://localhost:3005/health
- Payment Service: http://localhost:3006/health
- Pricing Service: http://localhost:3007/health
- Review Service: http://localhost:3008/health
- Notification Service: http://localhost:3009/health

## Technologies Used
- Node.js
- Express.js
- http-proxy-middleware (API Gateway)
- CORS
- Morgan (logging)
- Docker & Docker Compose

## Development Notes

- All services currently use in-memory storage (arrays)
- In production, replace with proper databases (MongoDB, PostgreSQL, etc.)
- Authentication currently uses mock tokens - implement JWT properly
- Passwords are not hashed - implement bcrypt in production
- Add proper error handling and validation
- Implement service-to-service authentication
- Add monitoring and logging solutions (ELK stack, Prometheus, etc.)
- Implement rate limiting and circuit breakers
- Add API documentation (Swagger/OpenAPI)

## Next Steps

1. Integrate databases for each service
2. Implement proper JWT authentication
3. Add input validation (using Joi or similar)
4. Implement service mesh (Istio) or API management
5. Add message queue (RabbitMQ/Kafka) for async communication
6. Implement distributed tracing (Jaeger, Zipkin)
7. Add comprehensive unit and integration tests
8. Set up CI/CD pipeline
9. Implement API rate limiting
10. Add comprehensive API documentation

## License
MIT
