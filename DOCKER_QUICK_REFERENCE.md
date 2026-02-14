# 🚀 Docker Quick Reference - Car Booking System

## 📦 Services Overview

| Service | Port | Health Check |
|---------|------|-------------|
| API Gateway | 3000 | http://localhost:3000/health |
| Auth Service | 3001 | http://localhost:3001/health |
| User Service | 3002 | http://localhost:3002/health |
| Booking Service | 3003 | http://localhost:3003/health |
| Ride Service | 3004 | http://localhost:3004/health |
| Driver Service | 3005 | http://localhost:3005/health |
| Payment Service | 3006 | http://localhost:3006/order |
| Pricing Service | 3007 | http://localhost:3007/health |
| Review Service | 3008 | http://localhost:3008/health |
| Notification Service | 3009 | http://localhost:3009/health |
| MySQL | 3306 | - |
| phpMyAdmin | 8080 | http://localhost:8080 |

## 🎯 Essential Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d api-gateway
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop specific service
docker-compose stop api-gateway
```

### View Status
```bash
# All containers
docker ps

# Specific service
docker ps | grep api-gateway
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 api-gateway
```

### Rebuild
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build api-gateway

# Rebuild and restart
docker-compose up -d --build
```

### Restart
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart api-gateway
```

### Execute Commands
```bash
# Shell into container
docker exec -it api-gateway sh

# Run command
docker exec api-gateway node -v
```

### Clean Up
```bash
# Stop and remove containers
docker-compose down

# Remove volumes too
docker-compose down -v

# Full cleanup
docker system prune -a
```

## 🧪 Testing Endpoints

### Health Checks
```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health
```

### API Gateway Routes
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get Users
curl http://localhost:3000/api/users

# Create Booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"pickupLocation":"A","dropoffLocation":"B"}'
```

## 🔍 Troubleshooting

### Check Container Health
```bash
docker ps
# Look for "(healthy)" status
```

### View Container Details
```bash
docker inspect api-gateway
```

### Check Resource Usage
```bash
docker stats
```

### View Networks
```bash
docker network ls
docker network inspect car-booking_cab_network
```

### View Volumes
```bash
docker volume ls
docker volume inspect car-booking_mysql_data
```

## 🎨 Postman Testing

Import `postman_collection.json` to test all API endpoints via Postman.

## 📱 Access Points

- **API Gateway**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080
- **MySQL**: localhost:3306 (root/root_password)

## 🔥 Emergency Commands

```bash
# Nuclear option - remove everything
docker-compose down -v
docker system prune -a --volumes
docker-compose up -d --build

# Just restart everything
docker-compose restart

# Rebuild one service
docker-compose up -d --build [service-name]
```

---

**Quick Start**: `docker-compose up -d`  
**Quick Stop**: `docker-compose down`  
**Quick Test**: `curl http://localhost:3000/health`
