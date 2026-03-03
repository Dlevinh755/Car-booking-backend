# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000

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
    npm run build

# ---- Runtime stage ----
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: redirect 404 to index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
