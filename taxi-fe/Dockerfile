# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN VITE_AUTH_URL=${VITE_API_BASE_URL} \
    VITE_BOOKING_URL=${VITE_API_BASE_URL} \
    VITE_PRICING_URL=${VITE_API_BASE_URL} \
    VITE_DRIVER_URL=${VITE_API_BASE_URL} \
    VITE_RIDE_URL=${VITE_API_BASE_URL} \
    VITE_NOTIFICATION_URL=${VITE_API_BASE_URL} \
    VITE_GEO_URL=${VITE_API_BASE_URL} \
    VITE_PAYMENT_URL=${VITE_API_BASE_URL} \
    npx vite build

# ---- Runtime stage ----
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
